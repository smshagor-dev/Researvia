import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
  AcceptingStudents,
  ApplicationStatus,
  FundingStatus,
  OpportunityStatus,
  OpportunityType,
  OpportunityVerificationStatus,
  Prisma,
  ScholarshipStatus,
  ScholarshipVerificationStatus,
} from '@prisma/client';
import type { Job } from 'bullmq';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { toPrismaJsonValue } from '../../shared/prisma/json.util';
import { RedisService } from '../../shared/redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProfessorSyncQueueService } from '../queues/professor-sync-queue.service';
import { SyncLogsService } from '../sync-logs/sync-logs.service';
import {
  OPPORTUNITY_DISCOVERY_JOB,
  OPPORTUNITY_DISCOVERY_QUEUE,
  OPPORTUNITY_QUALITY_SCORE_JOB,
  OPPORTUNITY_QUALITY_SCORE_QUEUE,
  OPPORTUNITY_SYNC_JOB,
  OPPORTUNITY_SYNC_QUEUE,
} from './opportunity.constants';
import {
  DiscoveredOpportunityInput,
  OpportunityDiscoveryJobData,
  OpportunityQualityScoreJobData,
  OpportunitySyncJobData,
} from './opportunity.types';
import { OpportunitiesService } from './opportunities.service';

@Injectable()
export class OpportunityDiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(OpportunityDiscoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncLogs: SyncLogsService,
    private readonly queues: ProfessorSyncQueueService,
    private readonly notifications: NotificationsService,
    private readonly redis: RedisService,
    private readonly opportunities: OpportunitiesService,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const total = await this.prisma.opportunity.count();
    if (total >= 5) {
      return;
    }

    const counters = await this.populateOpportunityCatalog(150, 200);
    this.logger.log(
      `Opportunity catalog ensured with ${counters.createdCount + counters.updatedCount} generated entries.`,
    );
  }

  async runDiscovery(job: Job<OpportunityDiscoveryJobData>) {
    const counters = this.createCounters();
    await this.syncLogs.markRunning(String(job.id));

    try {
      const populated = await this.populateOpportunityCatalog(300, 200, job.data.triggeredBy);
      counters.processedCount = populated.processedCount;
      counters.createdCount = populated.createdCount;
      counters.updatedCount = populated.updatedCount;
      counters.skippedCount = populated.skippedCount;

      await this.syncLogs.markCompleted(String(job.id), counters);
      return counters;
    } catch (error) {
      await this.syncLogs.markFailed(String(job.id), (error as Error).message, counters);
      throw error;
    }
  }

  async runSync(job: Job<OpportunitySyncJobData>) {
    const counters = this.createCounters();
    await this.syncLogs.markRunning(String(job.id));

    try {
      const opportunities = job.data.opportunityId
        ? [await this.getOpportunity(job.data.opportunityId)]
        : await this.prisma.opportunity.findMany({
            where: {
              status: { in: [OpportunityStatus.active, OpportunityStatus.draft, OpportunityStatus.expired] },
            },
            include: {
              applications: {
                include: {
                  user: { select: { id: true } },
                },
              },
            },
            take: 500,
          });

      for (const opportunity of opportunities) {
        const nextStatus = this.resolveStatus(opportunity.deadline, opportunity.verificationStatus);
        if (nextStatus !== opportunity.status) {
          await this.prisma.opportunity.update({
            where: { id: opportunity.id },
            data: { status: nextStatus },
          });
          counters.updatedCount += 1;
        }

        const deadline = opportunity.deadline ? new Date(opportunity.deadline) : null;
        if (deadline) {
          const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86400000);
          if ([30, 14, 7, 3, 1].includes(daysLeft)) {
            for (const application of opportunity.applications || []) {
              const terminalStatuses: ApplicationStatus[] = [
                ApplicationStatus.rejected,
                ApplicationStatus.withdrawn,
                ApplicationStatus.accepted,
              ];
              if (terminalStatuses.includes(application.status)) {
                continue;
              }
              await this.enqueueDeadlineNotification(application.userId, opportunity.id, opportunity.title, daysLeft);
            }
          }
        }

        counters.processedCount += 1;
      }

      const interviews = await this.prisma.interview.findMany({
        where: {
          status: { in: ['scheduled', 'rescheduled'] },
          scheduledAt: {
            gte: new Date(),
            lte: this.daysFromNow(1),
          },
        },
        include: {
          application: {
            include: {
              opportunity: true,
            },
          },
        },
      });

      for (const interview of interviews) {
        const key = `interview-reminder:${interview.id}:${interview.scheduledAt.toISOString().slice(0, 13)}`;
        const exists = await this.redis.exists(key);
        if (exists) {
          continue;
        }

        await this.notifications.create(interview.application.userId, {
          type: 'interview_upcoming',
          title: `Upcoming interview: ${interview.application.opportunity.title}`,
          body: `Interview starts at ${interview.scheduledAt.toLocaleString()} (${interview.timezone}).`,
          actionUrl: '/applications',
          data: {
            interviewId: interview.id,
            applicationId: interview.applicationId,
          },
        });
        await this.redis.set(key, '1', 86400);
      }

      await this.syncLogs.markCompleted(String(job.id), counters);
      return counters;
    } catch (error) {
      await this.syncLogs.markFailed(String(job.id), (error as Error).message, counters);
      throw error;
    }
  }

  async runQualityScore(job: Job<OpportunityQualityScoreJobData>) {
    const counters = this.createCounters();
    await this.syncLogs.markRunning(String(job.id));

    try {
      const opportunities = job.data.opportunityId
        ? [await this.getOpportunity(job.data.opportunityId)]
        : await this.prisma.opportunity.findMany({
            where: {
              status: { in: [OpportunityStatus.active, OpportunityStatus.draft] },
            },
            take: 500,
          });

      for (const opportunity of opportunities) {
        const score = this.calculateQualityScore(opportunity);
        await this.prisma.opportunity.update({
          where: { id: opportunity.id },
          data: { qualityScore: score },
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

  async queueDiscovery(triggeredBy: string) {
    const pendingJob = await this.queues.findFirstPendingJob(OPPORTUNITY_DISCOVERY_QUEUE);
    if (pendingJob) {
      return { jobId: pendingJob.id, status: pendingJob.state };
    }

    const job = await this.queues.enqueueOpportunityDiscovery({ triggeredBy });
    await this.syncLogs.createQueuedLog({
      jobId: String(job.id),
      queueName: OPPORTUNITY_DISCOVERY_QUEUE,
      jobName: OPPORTUNITY_DISCOVERY_JOB,
      metadataJson: toPrismaJsonValue({ triggeredBy }),
    });
    return { jobId: String(job.id) };
  }

  async queueSync(triggeredBy: string, opportunityId?: string) {
    if (!opportunityId) {
      const pendingJob = await this.queues.findFirstPendingJob(OPPORTUNITY_SYNC_QUEUE);
      if (pendingJob) {
        return { jobId: pendingJob.id, status: pendingJob.state };
      }
    }

    const job = await this.queues.enqueueOpportunitySync({ triggeredBy, opportunityId });
    await this.syncLogs.createQueuedLog({
      jobId: String(job.id),
      queueName: OPPORTUNITY_SYNC_QUEUE,
      jobName: OPPORTUNITY_SYNC_JOB,
      metadataJson: toPrismaJsonValue({ triggeredBy, opportunityId }),
    });
    return { jobId: String(job.id) };
  }

  async queueQualityScore(triggeredBy: string, opportunityId?: string) {
    if (!opportunityId) {
      const pendingJob = await this.queues.findFirstPendingJob(OPPORTUNITY_QUALITY_SCORE_QUEUE);
      if (pendingJob) {
        return { jobId: pendingJob.id, status: pendingJob.state };
      }
    }

    const job = await this.queues.enqueueOpportunityQualityScore({ triggeredBy, opportunityId });
    await this.syncLogs.createQueuedLog({
      jobId: String(job.id),
      queueName: OPPORTUNITY_QUALITY_SCORE_QUEUE,
      jobName: OPPORTUNITY_QUALITY_SCORE_JOB,
      metadataJson: toPrismaJsonValue({ triggeredBy, opportunityId }),
    });
    return { jobId: String(job.id) };
  }

  private async upsertOpportunity(input: DiscoveredOpportunityInput) {
    const slug = await this.generateSlug(input.title);
    const existing = await this.prisma.opportunity.findFirst({
      where: {
        OR: [
          {
            title: input.title,
            universityId: input.universityId || null,
            professorId: input.professorId || null,
          },
          input.officialUrl ? { officialUrl: input.officialUrl } : undefined,
        ].filter(Boolean) as Prisma.OpportunityWhereInput[],
      },
    });

    const data: Prisma.OpportunityUncheckedCreateInput = {
      title: input.title,
      slug: existing?.slug || slug,
      type: input.type,
      countryId: input.countryId || null,
      universityId: input.universityId || null,
      departmentId: input.departmentId || null,
      professorId: input.professorId || null,
      fundingAmount: input.fundingAmount ?? null,
      currency: input.currency || null,
      isFullyFunded: Boolean(input.isFullyFunded),
      description: input.description || '',
      requirements: input.requirements || null,
      deadline: input.deadline || null,
      officialUrl: input.officialUrl || null,
      sourceUrl: input.sourceUrl || null,
      verificationStatus: input.verificationStatus || OpportunityVerificationStatus.pending,
      status: input.status || OpportunityStatus.draft,
      qualityScore: existing?.qualityScore || 0,
    };

    return existing
      ? this.prisma.opportunity.update({
          where: { id: existing.id },
          data,
        })
      : this.prisma.opportunity.create({ data });
  }

  private async populateOpportunityCatalog(
    professorLimit: number,
    scholarshipLimit: number,
    triggeredBy = 'system-bootstrap',
  ) {
    const counters = this.createCounters();
    const [professors, scholarships] = await Promise.all([
      this.prisma.professor.findMany({
        where: {
          status: 'active',
          isPublic: true,
          verificationStatus: 'verified',
          OR: [
            { acceptingStudents: AcceptingStudents.yes },
            { fundingStatus: FundingStatus.funded },
            { researchAreas: { some: {} } },
          ],
        },
        include: {
          university: true,
          department: true,
        },
        take: professorLimit,
      }),
      this.prisma.scholarship.findMany({
        where: {
          status: ScholarshipStatus.active,
          verificationStatus: ScholarshipVerificationStatus.verified,
        },
        include: {
          university: true,
          country: true,
        },
        take: scholarshipLimit,
      }),
    ]);

    for (const professor of professors) {
      const saved = await this.upsertOpportunity(this.buildProfessorOpportunityInput(professor));
      counters.processedCount += 1;
      if (saved.createdAt.getTime() === saved.updatedAt.getTime()) {
        counters.createdCount += 1;
      } else {
        counters.updatedCount += 1;
      }

      const qualityJob = await this.queues.enqueueOpportunityQualityScore({
        triggeredBy,
        opportunityId: saved.id,
      });
      await this.syncLogs.createQueuedLog({
        jobId: String(qualityJob.id),
        queueName: OPPORTUNITY_QUALITY_SCORE_QUEUE,
        jobName: OPPORTUNITY_QUALITY_SCORE_JOB,
        metadataJson: toPrismaJsonValue({ opportunityId: saved.id }),
      });
    }

    for (const scholarship of scholarships) {
      const saved = await this.upsertOpportunity(this.buildScholarshipOpportunityInput(scholarship));
      counters.processedCount += 1;
      if (saved.createdAt.getTime() === saved.updatedAt.getTime()) {
        counters.createdCount += 1;
      } else {
        counters.updatedCount += 1;
      }
    }

    return counters;
  }

  private buildProfessorOpportunityInput(professor: {
    id: string;
    fullName: string;
    position: string | null;
    fundingStatus: FundingStatus;
    bio: string | null;
    universityId: string;
    departmentId: string | null;
    facultyPageUrl: string | null;
    labUrl: string | null;
    personalWebsite: string | null;
    university: { countryId: string | null; name: string; websiteUrl: string | null };
    department: { name: string } | null;
  }): DiscoveredOpportunityInput {
    return {
      title: `${professor.fullName} ${professor.fundingStatus === FundingStatus.funded ? 'Funded' : 'Open'} ${professor.position === 'postdoc' ? 'Postdoc' : 'PhD Position'}`,
      type: professor.position === 'postdoc' ? OpportunityType.postdoc : OpportunityType.phd_position,
      countryId: professor.university.countryId,
      universityId: professor.universityId,
      departmentId: professor.departmentId,
      professorId: professor.id,
      fundingAmount: professor.fundingStatus === FundingStatus.funded ? 25000 : null,
      currency: professor.fundingStatus === FundingStatus.funded ? 'USD' : null,
      isFullyFunded: professor.fundingStatus === FundingStatus.funded,
      description: professor.bio || `Research opening in ${professor.department?.name || professor.university.name}.`,
      requirements: 'Updated CV, unofficial transcript, concise research interests statement, and contact availability.',
      deadline: this.daysFromNow(90),
      officialUrl: professor.facultyPageUrl || professor.labUrl || professor.personalWebsite || professor.university.websiteUrl,
      sourceUrl: professor.facultyPageUrl || professor.university.websiteUrl,
      verificationStatus: OpportunityVerificationStatus.verified,
      status: OpportunityStatus.active,
    };
  }

  private buildScholarshipOpportunityInput(scholarship: {
    title: string;
    fundingType: string | null;
    countryId: string | null;
    universityId: string | null;
    fundingAmount: Prisma.Decimal | number | null;
    currency: string | null;
    isFullyFunded: boolean;
    description: string | null;
    eligibilityCriteria: string | null;
    deadline: Date | null;
    applicationUrl: string | null;
    officialSourceUrl: string | null;
    officialUrl: string | null;
    sourceUrl: string | null;
  }): DiscoveredOpportunityInput {
    const type =
      scholarship.fundingType === 'exchange'
        ? OpportunityType.exchange_program
        : scholarship.fundingType === 'grant'
          ? OpportunityType.research_grant
          : scholarship.fundingType === 'fellowship'
            ? OpportunityType.fellowship
            : scholarship.fundingType === 'internship'
              ? OpportunityType.research_internship
              : OpportunityType.lab_position;

    return {
      title: scholarship.title,
      type,
      countryId: scholarship.countryId,
      universityId: scholarship.universityId,
      fundingAmount: scholarship.fundingAmount ? Number(scholarship.fundingAmount) : null,
      currency: scholarship.currency,
      isFullyFunded: scholarship.isFullyFunded,
      description: scholarship.description || scholarship.eligibilityCriteria,
      requirements: scholarship.eligibilityCriteria,
      deadline: scholarship.deadline,
      officialUrl: scholarship.applicationUrl || scholarship.officialSourceUrl || scholarship.officialUrl,
      sourceUrl: scholarship.sourceUrl || scholarship.officialSourceUrl,
      verificationStatus: OpportunityVerificationStatus.verified,
      status:
        scholarship.deadline && scholarship.deadline.getTime() < Date.now()
          ? OpportunityStatus.expired
          : OpportunityStatus.active,
    };
  }

  private async enqueueDeadlineNotification(userId: string, opportunityId: string, title: string, daysLeft: number) {
    const key = `opportunity-deadline:${userId}:${opportunityId}:${daysLeft}`;
    const alreadySent = await this.redis.exists(key);
    if (alreadySent) {
      return;
    }

    await this.notifications.create(userId, {
      type: 'deadline_approaching',
      title: `Deadline approaching: ${title}`,
      body: `This opportunity closes in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
      actionUrl: '/applications',
      data: { opportunityId, daysLeft },
    });
    await this.redis.set(key, '1', Math.max(86400, daysLeft * 86400));
  }

  private calculateQualityScore(opportunity: {
    title: string;
    description: string | null;
    requirements: string | null;
    deadline: Date | null;
    officialUrl: string | null;
    professorId: string | null;
    universityId: string | null;
    isFullyFunded: boolean;
  }) {
    let score = 0;
    if (opportunity.title) score += 15;
    if (opportunity.description) score += 20;
    if (opportunity.requirements) score += 15;
    if (opportunity.deadline) score += 15;
    if (opportunity.officialUrl) score += 15;
    if (opportunity.professorId) score += 10;
    if (opportunity.universityId) score += 5;
    if (opportunity.isFullyFunded) score += 5;
    return Math.min(score, 100);
  }

  private resolveStatus(deadline: Date | null, verificationStatus: OpportunityVerificationStatus) {
    if (deadline && deadline.getTime() < Date.now()) {
      return OpportunityStatus.expired;
    }
    if (verificationStatus === OpportunityVerificationStatus.verified) {
      return OpportunityStatus.active;
    }
    if (verificationStatus === OpportunityVerificationStatus.rejected) {
      return OpportunityStatus.closed;
    }
    return OpportunityStatus.draft;
  }

  private async getOpportunity(id: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        applications: {
          include: {
            user: { select: { id: true } },
          },
        },
      },
    });
    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }
    return opportunity;
  }

  private async generateSlug(title: string) {
    let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existing = await this.prisma.opportunity.findUnique({ where: { slug } });
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

  private daysFromNow(days: number) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
