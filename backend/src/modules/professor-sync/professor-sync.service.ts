import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, Prisma, VerificationStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { toPrismaJsonValue } from '../../shared/prisma/json.util';
import { ACADEMIC_SOURCE_ADAPTERS } from '../discovery/discovery.constants';
import type {
  AcademicSourceAdapter,
  DeduplicateProfessorsJobData,
  ScoreProfessorQualityJobData,
  SourceProfessorDetails,
  SyncCounters,
  SyncProfessorProfilesJobData,
  SyncProfessorPublicationsJobData,
} from './professor-sync.types';
import { SyncLogsService } from '../sync-logs/sync-logs.service';
import { ProfessorSyncQueueService } from '../queues/professor-sync-queue.service';
import { slugify } from '../discovery/utils/normalize.util';
import { PROFESSOR_QUALITY_SCORE_QUEUE, QUALITY_SCORE_JOB_NAME } from './professor-sync.constants';

@Injectable()
export class ProfessorSyncService {
  private readonly logger = new Logger(ProfessorSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncLogs: SyncLogsService,
    private readonly queueService: ProfessorSyncQueueService,
    @Inject(ACADEMIC_SOURCE_ADAPTERS)
    private readonly adapters: AcademicSourceAdapter[],
  ) {}

  async runProfileSync(job: Job<SyncProfessorProfilesJobData>) {
    const counters = this.createCounters();
    await this.syncLogs.markRunning(String(job.id));

    try {
      const professors = await this.loadTargetProfessors(job.data.professorId);
      for (const professor of professors) {
        const source = await this.prisma.professorSource.findFirst({
          where: { professorId: professor.id },
          orderBy: { scrapedAt: 'desc' },
        });

        if (!source?.externalId) {
          counters.skippedCount += 1;
          continue;
        }

        const adapter = this.getAdapter(source.sourceType);
        if (!adapter) {
          counters.skippedCount += 1;
          continue;
        }

        const details = await adapter.getProfessorDetails(source.externalId);
        if (!details) {
          counters.skippedCount += 1;
          continue;
        }

        await this.applyProfessorDetails(professor.id, details, adapter.sourceType);
        const qualityJob = await this.queueService.enqueueQualityScore({
          professorId: professor.id,
          trigger: job.data.trigger || 'system',
        });
        await this.syncLogs.createQueuedLog({
          jobId: String(qualityJob.id),
          queueName: PROFESSOR_QUALITY_SCORE_QUEUE,
          jobName: QUALITY_SCORE_JOB_NAME,
          metadataJson: { professorId: professor.id, trigger: job.data.trigger || 'system' },
        });
        counters.processedCount += 1;
        counters.updatedCount += 1;
        await job.updateProgress(counters.processedCount);
      }

      await this.syncLogs.markCompleted(String(job.id), counters, toPrismaJsonValue({ filter: job.data }));
      return counters;
    } catch (error) {
      await this.syncLogs.markFailed(
        String(job.id),
        (error as Error).message,
        counters,
        toPrismaJsonValue({ filter: job.data }),
      );
      throw error;
    }
  }

  async runPublicationSync(job: Job<SyncProfessorPublicationsJobData>) {
    const counters = this.createCounters();
    await this.syncLogs.markRunning(String(job.id));

    try {
      const professors = await this.loadTargetProfessors(job.data.professorId);
      for (const professor of professors) {
        const source = await this.prisma.professorSource.findFirst({
          where: { professorId: professor.id, sourceType: DataSource.openalex },
          orderBy: { scrapedAt: 'desc' },
        });

        if (!source?.externalId) {
          counters.skippedCount += 1;
          continue;
        }

        const adapter = this.getAdapter(DataSource.openalex);
        const details = adapter ? await adapter.getProfessorDetails(source.externalId) : null;
        if (!details?.publications?.length) {
          counters.skippedCount += 1;
          continue;
        }

        for (const publication of details.publications) {
          const existing = await this.prisma.publication.findFirst({
            where: publication.externalId
              ? {
                  OR: [
                    { openalexId: publication.externalId },
                    { professorId: professor.id, title: publication.title },
                  ],
                }
              : { professorId: professor.id, title: publication.title },
          });

          if (existing) {
            await this.prisma.publication.update({
              where: { id: existing.id },
              data: {
                openalexId: publication.externalId || existing.openalexId,
                doi: publication.doi || existing.doi,
                abstract: publication.abstract || existing.abstract,
                venue: publication.venue || existing.venue,
                publicationYear: publication.publicationYear || existing.publicationYear,
                publicationDate: publication.publicationDate ? new Date(publication.publicationDate) : existing.publicationDate,
                citationCount: publication.citationCount || existing.citationCount,
                url: publication.url || existing.url,
                pdfUrl: publication.pdfUrl || existing.pdfUrl,
              },
            });
          } else {
            await this.prisma.publication.create({
              data: {
                professorId: professor.id,
                openalexId: publication.externalId || null,
                doi: publication.doi || null,
                title: publication.title,
                abstract: publication.abstract || null,
                venue: publication.venue || null,
                publicationYear: publication.publicationYear || null,
                publicationDate: publication.publicationDate ? new Date(publication.publicationDate) : null,
                citationCount: publication.citationCount || 0,
                url: publication.url || null,
                pdfUrl: publication.pdfUrl || null,
              },
            });
          }
        }

        counters.processedCount += 1;
        counters.updatedCount += 1;
        await job.updateProgress(counters.processedCount);
      }

      await this.syncLogs.markCompleted(String(job.id), counters, toPrismaJsonValue({ filter: job.data }));
      return counters;
    } catch (error) {
      await this.syncLogs.markFailed(
        String(job.id),
        (error as Error).message,
        counters,
        toPrismaJsonValue({ filter: job.data }),
      );
      throw error;
    }
  }

  async runQualityScore(job: Job<ScoreProfessorQualityJobData>) {
    const counters = this.createCounters();
    await this.syncLogs.markRunning(String(job.id));

    try {
      const professor = await this.prisma.professor.findUnique({
        where: { id: job.data.professorId },
        include: {
          university: true,
          department: true,
          researchAreas: true,
          publications: { select: { id: true } },
          sources: { select: { id: true } },
        },
      });

      if (!professor) {
        throw new NotFoundException('Professor not found for quality score calculation');
      }

      let score = 0;
      if (professor.fullName) score += 20;
      if (professor.universityId) score += 15;
      if (professor.departmentId) score += 15;
      if (professor.researchAreas.length > 0) score += 15;
      if ((professor.publicationsCount ?? professor.publications.length) > 0) score += 15;
      if (professor.sources.length > 0) score += 10;
      if (professor.orcidId || professor.personalWebsite || professor.googleScholarUrl || professor.labUrl) score += 10;

      await this.prisma.professor.update({
        where: { id: professor.id },
        data: {
          dataQualityScore: Math.min(100, score),
          lastSyncedAt: new Date(),
          verificationStatus: VerificationStatus.pending,
          isPublic: false,
        },
      });

      counters.processedCount = 1;
      counters.updatedCount = 1;
      await this.syncLogs.markCompleted(
        String(job.id),
        counters,
        toPrismaJsonValue({ professorId: professor.id, score }),
      );
      return { score };
    } catch (error) {
      await this.syncLogs.markFailed(
        String(job.id),
        (error as Error).message,
        counters,
        toPrismaJsonValue({ professorId: job.data.professorId }),
      );
      throw error;
    }
  }

  async runDeduplication(job: Job<DeduplicateProfessorsJobData>) {
    const counters = this.createCounters();
    await this.syncLogs.markRunning(String(job.id));

    try {
      const professors = await this.prisma.professor.findMany({
        where: { status: 'active' },
        include: {
          university: { select: { id: true, name: true } },
          emails: { where: { isVerified: true }, select: { email: true } },
          sources: { select: { sourceType: true, externalId: true } },
        },
      });

      const groups = new Map<string, string[]>();
      const pushGroup = (key: string, professorId: string) => {
        const existing = groups.get(key) || [];
        existing.push(professorId);
        groups.set(key, existing);
      };

      professors.forEach((professor) => {
        pushGroup(`name:${slugify(`${professor.fullName}-${professor.universityId}`)}`, professor.id);
        if (professor.orcidId) pushGroup(`orcid:${professor.orcidId}`, professor.id);
        professor.emails.forEach((email) => pushGroup(`email:${email.email.toLowerCase()}`, professor.id));
        professor.sources.forEach((source) => {
          if (source.externalId) {
            pushGroup(`source:${source.sourceType}:${source.externalId}`, professor.id);
          }
        });
      });

      const duplicateGroups = [...groups.entries()]
        .filter(([, ids]) => new Set(ids).size > 1)
        .map(([key, ids]) => ({ key, professorIds: [...new Set(ids)] }));

      counters.processedCount = professors.length;
      counters.skippedCount = duplicateGroups.length === 0 ? professors.length : 0;

      const metadata = toPrismaJsonValue({
        duplicateGroupCount: duplicateGroups.length,
        duplicateGroups,
      });

      if (duplicateGroups.length > 0) {
        await this.syncLogs.markPartial(String(job.id), counters, metadata);
      } else {
        await this.syncLogs.markCompleted(String(job.id), counters, metadata);
      }

      return metadata;
    } catch (error) {
      await this.syncLogs.markFailed(String(job.id), (error as Error).message, counters);
      throw error;
    }
  }

  private async applyProfessorDetails(professorId: string, details: SourceProfessorDetails, sourceType: DataSource) {
    await this.prisma.professor.update({
      where: { id: professorId },
      data: {
        fullName: details.fullName,
        firstName: details.firstName ?? undefined,
        lastName: details.lastName ?? undefined,
        title: details.title ?? undefined,
        bio: details.bio ?? undefined,
        avatarUrl: details.avatarUrl ?? undefined,
        personalWebsite: details.personalWebsite ?? undefined,
        googleScholarUrl: details.googleScholarUrl ?? undefined,
        labUrl: details.labUrl ?? undefined,
        openalexId: details.openalexId ?? undefined,
        orcidId: details.orcidId ?? undefined,
        hIndex: details.hIndex ?? undefined,
        citationsCount: details.citationsCount ?? undefined,
        publicationsCount: details.publicationsCount ?? undefined,
        lastPublicationYear: details.lastPublicationYear ?? undefined,
        sourceType,
        verificationStatus: VerificationStatus.pending,
        isPublic: false,
        lastSyncedAt: new Date(),
      },
    });

    for (const areaName of details.researchAreas) {
      const slug = slugify(areaName);
      const area = await this.prisma.researchArea.upsert({
        where: { slug },
        update: { name: areaName },
        create: { name: areaName, slug },
      });
      await this.prisma.professorResearchArea.upsert({
        where: {
          professorId_researchAreaId: {
            professorId,
            researchAreaId: area.id,
          },
        },
        update: { source: sourceType },
        create: {
          professorId,
          researchAreaId: area.id,
          source: sourceType,
        },
      });
    }

    await this.prisma.professorSource.updateMany({
      where: { professorId, sourceType },
      data: {
        rawPayloadJson: details.rawPayload as Prisma.InputJsonValue,
        scrapedAt: new Date(),
      },
    });
  }

  private createCounters(): SyncCounters {
    return { processedCount: 0, createdCount: 0, updatedCount: 0, skippedCount: 0 };
  }

  private getAdapter(sourceType: DataSource) {
    return this.adapters.find((adapter) => adapter.sourceType === sourceType);
  }

  private loadTargetProfessors(professorId?: string) {
    return this.prisma.professor.findMany({
      where: professorId ? { id: professorId } : { status: 'active' },
      select: { id: true },
      orderBy: { updatedAt: 'asc' },
    });
  }
}
