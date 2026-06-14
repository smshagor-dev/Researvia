import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  FundingType,
  Prisma,
  ScholarshipDegreeLevel,
  ScholarshipSourceType,
  ScholarshipStatus,
  ScholarshipVerificationStatus,
} from '@prisma/client';
import type { Job } from 'bullmq';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { toPrismaJsonValue } from '../../shared/prisma/json.util';
import { RedisService } from '../../shared/redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SyncLogsService } from '../sync-logs/sync-logs.service';
import { ProfessorSyncQueueService } from '../queues/professor-sync-queue.service';
import {
  SCHOLARSHIP_DEADLINE_CHECK_JOB,
  SCHOLARSHIP_DEADLINE_CHECK_QUEUE,
  SCHOLARSHIP_DISCOVERY_JOB,
  SCHOLARSHIP_DISCOVERY_QUEUE,
  SCHOLARSHIP_QUALITY_SCORE_JOB,
  SCHOLARSHIP_QUALITY_SCORE_QUEUE,
  SCHOLARSHIP_SOURCE_ADAPTERS,
  SCHOLARSHIP_SYNC_JOB,
  SCHOLARSHIP_SYNC_QUEUE,
} from './scholarship.constants';
import type {
  NormalizedScholarship,
  ScholarshipDeadlineCheckJobData,
  ScholarshipQualityScoreJobData,
  ScholarshipSourceAdapter,
  ScholarshipDiscoveryJobData,
  ScholarshipSyncJobData,
} from './scholarship.types';

@Injectable()
export class ScholarshipDiscoveryService {
  private readonly logger = new Logger(ScholarshipDiscoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncLogs: SyncLogsService,
    private readonly queues: ProfessorSyncQueueService,
    private readonly notifications: NotificationsService,
    private readonly redis: RedisService,
    @Inject(SCHOLARSHIP_SOURCE_ADAPTERS)
    private readonly adapters: ScholarshipSourceAdapter[],
  ) {}

  async runDiscovery(job: Job<ScholarshipDiscoveryJobData>) {
    const counters = this.createCounters();
    await this.syncLogs.markRunning(String(job.id));

    try {
      const adapters = this.getAdapters(job.data.sourceTypes);
      for (const adapter of adapters) {
        const scholarships = await adapter.searchScholarships();
        for (const scholarship of scholarships) {
          const saved = await this.upsertScholarshipFromSource(adapter, scholarship);
          const syncJob = await this.queues.enqueueScholarshipSync({
            scholarshipId: saved.id,
            triggeredBy: job.data.triggeredBy || 'system',
          });

          await this.syncLogs.createQueuedLog({
            jobId: String(syncJob.id),
            queueName: SCHOLARSHIP_SYNC_QUEUE,
            jobName: SCHOLARSHIP_SYNC_JOB,
            metadataJson: toPrismaJsonValue({ scholarshipId: saved.id, sourceType: adapter.sourceType }),
          });

          counters.processedCount += 1;
          counters.updatedCount += 1;
          await job.updateProgress(counters.processedCount);
        }
      }

      await this.syncLogs.markCompleted(String(job.id), counters, toPrismaJsonValue({ sourceTypes: job.data.sourceTypes || 'all' }));
      return counters;
    } catch (error) {
      await this.syncLogs.markFailed(String(job.id), (error as Error).message, counters);
      throw error;
    }
  }

  async runSync(job: Job<ScholarshipSyncJobData>) {
    const counters = this.createCounters();
    await this.syncLogs.markRunning(String(job.id));

    try {
      const targets = job.data.scholarshipId
        ? [await this.getScholarship(job.data.scholarshipId)]
        : await this.prisma.scholarship.findMany({
            where: {
              status: { in: [ScholarshipStatus.active, ScholarshipStatus.draft] },
              ...(job.data.sourceTypes?.length ? { sourceType: { in: job.data.sourceTypes } } : {}),
            },
            orderBy: { updatedAt: 'asc' },
            take: 250,
          });

      for (const scholarship of targets) {
        const adapter = this.adapters.find((item) => item.sourceType === scholarship.sourceType);
        if (!adapter || !scholarship.sourceExternalId) {
          counters.skippedCount += 1;
          continue;
        }

        const details = await adapter.getScholarshipDetails(
          scholarship.sourceExternalId,
          scholarship.officialSourceUrl || scholarship.sourceUrl || scholarship.officialUrl,
        );

        if (!details) {
          counters.skippedCount += 1;
          continue;
        }

        await this.upsertScholarshipFromSource(adapter, details, scholarship.id);

        const qualityJob = await this.queues.enqueueScholarshipQualityScore({
          scholarshipId: scholarship.id,
          triggeredBy: job.data.triggeredBy || 'system',
        });

        await this.syncLogs.createQueuedLog({
          jobId: String(qualityJob.id),
          queueName: SCHOLARSHIP_QUALITY_SCORE_QUEUE,
          jobName: SCHOLARSHIP_QUALITY_SCORE_JOB,
          metadataJson: toPrismaJsonValue({ scholarshipId: scholarship.id }),
        });

        counters.processedCount += 1;
        counters.updatedCount += 1;
        await job.updateProgress(counters.processedCount);
      }

      await this.syncLogs.markCompleted(String(job.id), counters);
      return counters;
    } catch (error) {
      await this.syncLogs.markFailed(String(job.id), (error as Error).message, counters);
      throw error;
    }
  }

  async runDeadlineCheck(job: Job<ScholarshipDeadlineCheckJobData>) {
    const counters = this.createCounters();
    await this.syncLogs.markRunning(String(job.id));

    try {
      const scholarships = await this.prisma.scholarship.findMany({
        where: {
          deadline: { not: null },
          status: { in: [ScholarshipStatus.active, ScholarshipStatus.draft, ScholarshipStatus.expired] },
        },
        include: {
          savedScholarships: {
            include: { user: { select: { id: true } } },
          },
        },
      });

      const now = new Date();
      for (const scholarship of scholarships) {
        const deadline = scholarship.deadline ? new Date(scholarship.deadline) : null;
        if (!deadline) {
          counters.skippedCount += 1;
          continue;
        }

        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
        const nextStatus =
          daysLeft < 0 ? ScholarshipStatus.expired : scholarship.verificationStatus === ScholarshipVerificationStatus.verified ? ScholarshipStatus.active : ScholarshipStatus.draft;

        await this.prisma.scholarship.update({
          where: { id: scholarship.id },
          data: {
            status: nextStatus,
            isActive: nextStatus === ScholarshipStatus.active,
            isExpired: nextStatus === ScholarshipStatus.expired,
            expiresAt: nextStatus === ScholarshipStatus.expired ? now : scholarship.expiresAt,
          },
        });

        for (const interval of [30, 14, 7, 1]) {
          if (daysLeft === interval) {
            for (const saved of scholarship.savedScholarships) {
              await this.enqueueDeadlineNotification(saved.userId, scholarship.id, scholarship.title, interval, deadline);
            }
          }
        }

        counters.processedCount += 1;
      }

      await this.syncLogs.markCompleted(String(job.id), counters);
      return counters;
    } catch (error) {
      await this.syncLogs.markFailed(String(job.id), (error as Error).message, counters);
      throw error;
    }
  }

  async runQualityScore(job: Job<ScholarshipQualityScoreJobData>) {
    const counters = this.createCounters();
    await this.syncLogs.markRunning(String(job.id));

    try {
      const scholarships = job.data.scholarshipId
        ? [await this.getScholarship(job.data.scholarshipId)]
        : await this.prisma.scholarship.findMany({
            where: { status: { in: [ScholarshipStatus.active, ScholarshipStatus.draft] } },
            take: 500,
          });

      for (const scholarship of scholarships) {
        const qualityScore = this.calculateQualityScore(scholarship);
        await this.prisma.scholarship.update({
          where: { id: scholarship.id },
          data: { qualityScore, lastSyncedAt: new Date() },
        });
        counters.processedCount += 1;
        counters.updatedCount += 1;
      }

      await this.syncLogs.markCompleted(String(job.id), counters);
      return counters;
    } catch (error) {
      await this.syncLogs.markFailed(String(job.id), (error as Error).message, counters);
      throw error;
    }
  }

  async queueDiscovery(triggeredBy: string, sourceTypes?: ScholarshipSourceType[]) {
    const job = await this.queues.enqueueScholarshipDiscovery({ triggeredBy, sourceTypes });
    await this.syncLogs.createQueuedLog({
      jobId: String(job.id),
      queueName: SCHOLARSHIP_DISCOVERY_QUEUE,
      jobName: SCHOLARSHIP_DISCOVERY_JOB,
      metadataJson: toPrismaJsonValue({ triggeredBy, sourceTypes }),
    });
    return { jobId: String(job.id) };
  }

  async queueDetailsSync(triggeredBy: string, scholarshipId?: string) {
    const job = await this.queues.enqueueScholarshipSync({ triggeredBy, scholarshipId });
    await this.syncLogs.createQueuedLog({
      jobId: String(job.id),
      queueName: SCHOLARSHIP_SYNC_QUEUE,
      jobName: SCHOLARSHIP_SYNC_JOB,
      metadataJson: toPrismaJsonValue({ triggeredBy, scholarshipId }),
    });
    return { jobId: String(job.id) };
  }

  async queueDeadlineCheck(triggeredBy: string) {
    const job = await this.queues.enqueueScholarshipDeadlineCheck({ triggeredBy });
    await this.syncLogs.createQueuedLog({
      jobId: String(job.id),
      queueName: SCHOLARSHIP_DEADLINE_CHECK_QUEUE,
      jobName: SCHOLARSHIP_DEADLINE_CHECK_JOB,
      metadataJson: toPrismaJsonValue({ triggeredBy }),
    });
    return { jobId: String(job.id) };
  }

  async queueQualityScore(triggeredBy: string, scholarshipId?: string) {
    const job = await this.queues.enqueueScholarshipQualityScore({ triggeredBy, scholarshipId });
    await this.syncLogs.createQueuedLog({
      jobId: String(job.id),
      queueName: SCHOLARSHIP_QUALITY_SCORE_QUEUE,
      jobName: SCHOLARSHIP_QUALITY_SCORE_JOB,
      metadataJson: toPrismaJsonValue({ triggeredBy, scholarshipId }),
    });
    return { jobId: String(job.id) };
  }

  async approveScholarship(id: string) {
    return this.prisma.scholarship.update({
      where: { id },
      data: {
        verificationStatus: ScholarshipVerificationStatus.verified,
        isVerified: true,
        status: ScholarshipStatus.active,
        isActive: true,
      },
    });
  }

  async rejectScholarship(id: string) {
    return this.prisma.scholarship.update({
      where: { id },
      data: {
        verificationStatus: ScholarshipVerificationStatus.rejected,
        isVerified: false,
        status: ScholarshipStatus.closed,
        isActive: false,
      },
    });
  }

  private async upsertScholarshipFromSource(adapter: ScholarshipSourceAdapter, scholarship: NormalizedScholarship, existingId?: string) {
    const country = await this.resolveCountry(scholarship.countryCode, scholarship.countryName);
    const university = await this.resolveUniversity(scholarship.universityName, country?.id);

    const existing = existingId
      ? await this.prisma.scholarship.findUnique({ where: { id: existingId } })
      : await this.findExistingScholarship(scholarship);

    const duplicateMatches = await this.prisma.scholarship.findMany({
      where: {
        OR: [
          scholarship.sourceExternalId ? { sourceExternalId: scholarship.sourceExternalId } : undefined,
          { officialSourceUrl: scholarship.officialSourceUrl },
          {
            title: scholarship.title,
            providerName: scholarship.providerName,
          },
        ].filter(Boolean) as Prisma.ScholarshipWhereInput[],
      },
      select: { id: true },
    });

    const data: Prisma.ScholarshipUncheckedCreateInput = {
      title: scholarship.title,
      slug: existing?.slug || (await this.generateSlug(scholarship.title)),
      providerName: scholarship.providerName,
      providerType: scholarship.providerType || null,
      description: scholarship.description || null,
      countryId: country?.id || null,
      universityId: university?.id || null,
      fundingType: scholarship.fundingType || FundingType.scholarship,
      degreeLevel: scholarship.degreeLevel || ScholarshipDegreeLevel.mixed,
      degreeLevels: toPrismaJsonValue((scholarship.degreeLevels || [scholarship.degreeLevel || ScholarshipDegreeLevel.mixed]).map(String)),
      fieldsOfStudy: scholarship.researchAreas?.length ? toPrismaJsonValue(scholarship.researchAreas) : Prisma.JsonNull,
      fundingAmount: scholarship.fundingAmount ?? null,
      amount: scholarship.fundingAmount ?? null,
      currency: scholarship.currency || null,
      isFullyFunded: Boolean(scholarship.isFullyFunded),
      applicationUrl: scholarship.applicationUrl || scholarship.officialSourceUrl,
      officialSourceUrl: scholarship.officialSourceUrl,
      deadline: this.toDate(scholarship.deadline),
      applicationOpenDate: this.toDate(scholarship.applicationOpenDate),
      applicationCloseDate: this.toDate(scholarship.applicationCloseDate) || this.toDate(scholarship.deadline),
      eligibilityCriteria: scholarship.eligibilityCriteria || null,
      eligibility: scholarship.eligibilityCriteria || null,
      requiredDocuments: scholarship.requiredDocuments?.length ? toPrismaJsonValue(scholarship.requiredDocuments) : Prisma.JsonNull,
      researchAreas: scholarship.researchAreas?.length ? toPrismaJsonValue(scholarship.researchAreas) : Prisma.JsonNull,
      officialUrl: scholarship.officialSourceUrl,
      source: 'api',
      sourceType: adapter.sourceType,
      sourceExternalId: scholarship.sourceExternalId || null,
      sourceUrl: scholarship.officialSourceUrl,
      status: ScholarshipStatus.draft,
      verificationStatus: ScholarshipVerificationStatus.pending,
      isVerified: false,
      isActive: false,
      isExpired: false,
      lastSyncedAt: new Date(),
      duplicateKey: scholarship.sourceExternalId || scholarship.officialSourceUrl,
      needsReview: duplicateMatches.length > 1,
    };

    const saved = existing
      ? await this.prisma.scholarship.update({
          where: { id: existing.id },
          data,
        })
      : await this.prisma.scholarship.create({ data });

    const existingSource = await this.prisma.scholarshipSource.findFirst({
      where: {
        scholarshipId: saved.id,
        sourceType: adapter.sourceType,
        ...(scholarship.sourceExternalId ? { externalId: scholarship.sourceExternalId } : { sourceUrl: scholarship.officialSourceUrl }),
      },
    });

    if (existingSource) {
      await this.prisma.scholarshipSource.update({
        where: { id: existingSource.id },
        data: {
          sourceUrl: scholarship.officialSourceUrl,
          rawPayloadJson: toPrismaJsonValue(scholarship.metadata || scholarship),
          scrapedAt: new Date(),
        },
      });
    } else {
      await this.prisma.scholarshipSource.create({
        data: {
          scholarshipId: saved.id,
          sourceType: adapter.sourceType,
          sourceName: adapter.sourceName,
          sourceUrl: scholarship.officialSourceUrl,
          externalId: scholarship.sourceExternalId || null,
          rawPayloadJson: toPrismaJsonValue(scholarship.metadata || scholarship),
        },
      });
    }

    return saved;
  }

  private async enqueueDeadlineNotification(userId: string, scholarshipId: string, title: string, interval: number, deadline: Date) {
    const key = `scholarship-deadline:${userId}:${scholarshipId}:${interval}`;
    const alreadySent = await this.redis.exists(key);
    if (alreadySent) {
      return;
    }

    await this.notifications.create(userId, {
      type: 'scholarship_deadline',
      title: `${title} deadline approaching`,
      body: `This scholarship closes in ${interval} day${interval === 1 ? '' : 's'}.`,
      actionUrl: `/scholarships/${scholarshipId}`,
      data: { scholarshipId, interval, deadline: deadline.toISOString() },
    });

    await this.redis.set(key, '1', Math.max(interval * 86400, 86400));
  }

  private calculateQualityScore(scholarship: {
    title: string;
    deadline: Date | null;
    officialSourceUrl?: string | null;
    eligibilityCriteria?: string | null;
    fundingAmount?: Prisma.Decimal | null;
    applicationUrl?: string | null;
  }) {
    let score = 0;
    if (scholarship.title) score += 20;
    if (scholarship.deadline) score += 20;
    if (scholarship.officialSourceUrl) score += 20;
    if (scholarship.eligibilityCriteria) score += 15;
    if (scholarship.fundingAmount) score += 15;
    if (scholarship.applicationUrl) score += 10;
    return Math.min(score, 100);
  }

  private getAdapters(sourceTypes?: ScholarshipSourceType[]) {
    if (!sourceTypes || sourceTypes.length === 0) {
      return this.adapters;
    }

    return this.adapters.filter((adapter) => sourceTypes.includes(adapter.sourceType));
  }

  private async resolveCountry(countryCode?: string | null, countryName?: string | null) {
    if (countryCode) {
      const byCode = await this.prisma.country.findFirst({
        where: { OR: [{ isoAlpha2: countryCode.toUpperCase() }, { isoAlpha3: countryCode.toUpperCase() }] },
      });
      if (byCode) {
        return byCode;
      }
    }

    if (countryName) {
      return this.prisma.country.findFirst({
        where: { name: countryName },
      });
    }

    return null;
  }

  private async resolveUniversity(universityName?: string | null, countryId?: string | null) {
    if (!universityName) {
      return null;
    }

    return this.prisma.university.findFirst({
      where: {
        name: universityName,
        ...(countryId ? { countryId } : {}),
      },
    });
  }

  private async findExistingScholarship(scholarship: NormalizedScholarship) {
    return this.prisma.scholarship.findFirst({
      where: {
        OR: [
          scholarship.sourceExternalId ? { sourceExternalId: scholarship.sourceExternalId } : undefined,
          { officialSourceUrl: scholarship.officialSourceUrl },
          { title: scholarship.title, providerName: scholarship.providerName },
        ].filter(Boolean) as Prisma.ScholarshipWhereInput[],
      },
    });
  }

  private async getScholarship(id: string) {
    const scholarship = await this.prisma.scholarship.findUnique({ where: { id } });
    if (!scholarship) {
      throw new NotFoundException('Scholarship not found');
    }
    return scholarship;
  }

  private toDate(value?: string | Date | null) {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private async generateSlug(title: string) {
    let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existing = await this.prisma.scholarship.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }
    return slug;
  }

  private createCounters() {
    return {
      processedCount: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
    };
  }
}
