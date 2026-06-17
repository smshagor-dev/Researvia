import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AcceptingStudents,
  DataSource,
  EmailVerificationStatus,
  FundingStatus,
  Prisma,
  ProfessorPosition,
  VerificationStatus,
} from '@prisma/client';
import type { Job } from 'bullmq';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { toPrismaJsonValue } from '../../shared/prisma/json.util';
import { ProfessorSyncQueueService } from '../queues/professor-sync-queue.service';
import { SyncLogsService } from '../sync-logs/sync-logs.service';
import { ACADEMIC_SOURCE_ADAPTERS } from './discovery.constants';
import type {
  AcademicSourceAdapter,
  DiscoverProfessorsJobData,
  DiscoverySearchParams,
  SourceProfessorCandidate,
  SyncCounters,
} from '../professor-sync/professor-sync.types';
import { slugify, normalizeName } from './utils/normalize.util';
import { hashEmail } from '../faculty-scraper/utils/email.util';
import { PROFESSOR_QUALITY_SCORE_QUEUE, QUALITY_SCORE_JOB_NAME } from '../professor-sync/professor-sync.constants';
import { SystemSettingsService } from '../system-settings/system-settings.service';

type OpenAlexAuthorRecord = {
  id: string;
  display_name?: string;
  full_name?: string;
  orcid?: string | null;
  works_count?: number;
  cited_by_count?: number;
  summary_stats?: {
    h_index?: number | null;
  };
  ids?: {
    openalex?: string;
    orcid?: string;
  };
  x_concepts?: Array<{
    display_name?: string;
    score?: number;
    id?: string;
  }>;
};

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncLogs: SyncLogsService,
    private readonly queueService: ProfessorSyncQueueService,
    private readonly systemSettings: SystemSettingsService,
    @Inject(ACADEMIC_SOURCE_ADAPTERS)
    private readonly adapters: AcademicSourceAdapter[],
  ) {}

  async runDiscovery(job: Job<DiscoverProfessorsJobData>) {
    const counters: SyncCounters = {
      processedCount: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
    };
    const failures: Array<{ source: string; universityId: string; researchAreaId: string; error: string }> = [];

    await this.syncLogs.markRunning(String(job.id));
    await job.log('Starting professor discovery run');

    try {
      const [universities, researchAreas] = await Promise.all([
        this.loadUniversities(job.data.universityIds),
        this.loadResearchAreas(job.data.researchAreaIds),
      ]);

      const activeAdapters = this.getAdapters(job.data.sourceTypes);

      const openAlexAdapter = activeAdapters.find((adapter) => adapter.sourceType === DataSource.openalex);
      if (openAlexAdapter) {
        await this.runOpenAlexUniversityImport(job, openAlexAdapter, universities, counters, failures);
      }

      const secondaryAdapters = activeAdapters.filter((adapter) => adapter.sourceType !== DataSource.openalex);

      for (const adapter of secondaryAdapters) {
        for (const university of universities) {
          for (const researchArea of researchAreas) {
            const params: DiscoverySearchParams = {
              university,
              researchArea,
              limit: job.data.limitPerCombination ?? 10,
            };

            try {
              const candidates = await adapter.searchProfessors(params);
              await job.log(
                `Adapter ${adapter.name} returned ${candidates.length} candidates for ${university.name} / ${researchArea.name}`,
              );

              for (const candidate of candidates) {
                counters.processedCount += 1;
                const result = await this.upsertProfessor(adapter, university, researchArea, candidate);
                counters.createdCount += result === 'created' ? 1 : 0;
                counters.updatedCount += result === 'updated' ? 1 : 0;
                counters.skippedCount += result === 'skipped' ? 1 : 0;
                await job.updateProgress(counters.processedCount);
              }
            } catch (error) {
              failures.push({
                source: adapter.name,
                universityId: university.id,
                researchAreaId: researchArea.id,
                error: (error as Error).message,
              });
              await job.log(`Discovery failure for ${adapter.name}: ${(error as Error).message}`);
            }
          }
        }
      }

      const metadata = toPrismaJsonValue({
        failures,
        filters: job.data,
      });

      if (failures.length > 0) {
        await this.syncLogs.markPartial(String(job.id), counters, metadata);
      } else {
        await this.syncLogs.markCompleted(String(job.id), counters, metadata);
      }

      return {
        ...counters,
        failures,
      };
    } catch (error) {
      await this.syncLogs.markFailed(
        String(job.id),
        (error as Error).message,
        counters,
        toPrismaJsonValue({ filters: job.data }),
      );
      throw error;
    }
  }

  private async upsertProfessor(
    adapter: AcademicSourceAdapter,
    university: Awaited<ReturnType<DiscoveryService['loadUniversities']>>[number],
    researchArea: Awaited<ReturnType<DiscoveryService['loadResearchAreas']>>[number] | null,
    candidate: SourceProfessorCandidate,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const existing = await this.findExistingProfessor(adapter.sourceType, candidate, university.id);
    const departmentId = await this.resolveDepartmentId(university.id, candidate.departmentName);
    const professorData: Prisma.ProfessorUncheckedCreateInput = {
      universityId: university.id,
      departmentId,
      openalexId: candidate.openalexId ?? null,
      orcidId: candidate.orcidId ?? null,
      fullName: candidate.fullName,
      firstName: candidate.firstName ?? null,
      lastName: candidate.lastName ?? null,
      title: candidate.title ?? null,
      position: candidate.position ?? ProfessorPosition.professor,
      bio: candidate.bio ?? null,
      avatarUrl: candidate.avatarUrl ?? null,
      personalWebsite: candidate.personalWebsite ?? null,
      googleScholarUrl: candidate.googleScholarUrl ?? null,
      labUrl: candidate.labUrl ?? null,
      hIndex: candidate.hIndex ?? null,
      citationsCount: candidate.citationsCount ?? null,
      publicationsCount: candidate.publicationsCount ?? null,
      acceptingStudents: AcceptingStudents.unknown,
      fundingStatus: FundingStatus.unknown,
      lastPublicationYear: candidate.lastPublicationYear ?? null,
      status: 'active',
      dataSource: adapter.sourceType,
      verificationStatus: VerificationStatus.pending,
      isPublic: false,
      sourceType: adapter.sourceType,
      lastSyncedAt: new Date(),
      dataQualityScore: null,
    };

    const professor = existing
      ? await this.prisma.professor.update({
          where: { id: existing.id },
          data: {
            fullName: candidate.fullName,
            firstName: candidate.firstName ?? existing.firstName,
            lastName: candidate.lastName ?? existing.lastName,
            title: candidate.title ?? existing.title,
            bio: candidate.bio ?? existing.bio,
            avatarUrl: candidate.avatarUrl ?? existing.avatarUrl,
            personalWebsite: candidate.personalWebsite ?? existing.personalWebsite,
            googleScholarUrl: candidate.googleScholarUrl ?? existing.googleScholarUrl,
            labUrl: candidate.labUrl ?? existing.labUrl,
            openalexId: candidate.openalexId ?? existing.openalexId,
            orcidId: candidate.orcidId ?? existing.orcidId,
            departmentId: departmentId ?? existing.departmentId,
            hIndex: candidate.hIndex ?? existing.hIndex,
            citationsCount: candidate.citationsCount ?? existing.citationsCount,
            publicationsCount: candidate.publicationsCount ?? existing.publicationsCount,
            lastPublicationYear: candidate.lastPublicationYear ?? existing.lastPublicationYear,
            sourceType: adapter.sourceType,
            lastSyncedAt: new Date(),
          },
        })
      : await this.prisma.professor.create({ data: professorData });

    await this.upsertProfessorSource(professor.id, adapter, candidate);
    await this.upsertProfessorEmails(professor.id, university.emailDomains || [], candidate);
    await this.upsertResearchAreas(
      professor.id,
      [...(researchArea?.name ? [researchArea.name] : []), ...candidate.researchAreas],
      adapter.sourceType,
    );
    const qualityJob = await this.queueService.enqueueQualityScore({ professorId: professor.id, trigger: 'system' });
    await this.syncLogs.createQueuedLog({
      jobId: String(qualityJob.id),
      queueName: PROFESSOR_QUALITY_SCORE_QUEUE,
      jobName: QUALITY_SCORE_JOB_NAME,
      metadataJson: { professorId: professor.id, trigger: 'system' },
    });

    return existing ? 'updated' : 'created';
  }

  private async findExistingProfessor(sourceType: DataSource, candidate: SourceProfessorCandidate, universityId: string) {
    if (candidate.externalId) {
      const bySource = await this.prisma.professorSource.findFirst({
        where: { sourceType, externalId: candidate.externalId },
        include: { professor: true },
      });
      if (bySource?.professor) {
        return bySource.professor;
      }
    }

    if (candidate.orcidId) {
      const byOrcid = await this.prisma.professor.findFirst({ where: { orcidId: candidate.orcidId } });
      if (byOrcid) {
        return byOrcid;
      }
    }

    if (candidate.emails.length > 0) {
      const byEmail = await this.prisma.professorEmail.findFirst({
        where: { email: { in: candidate.emails.map((email) => email.email) } },
        include: { professor: true },
      });
      if (byEmail?.professor) {
        return byEmail.professor;
      }
    }

    const normalizedCandidateName = normalizeName(candidate.fullName);
    const byName = await this.prisma.professor.findMany({
      where: { universityId },
      select: {
        id: true,
        fullName: true,
        firstName: true,
        lastName: true,
        title: true,
        bio: true,
        avatarUrl: true,
        personalWebsite: true,
        googleScholarUrl: true,
        labUrl: true,
        openalexId: true,
        orcidId: true,
        departmentId: true,
        hIndex: true,
        citationsCount: true,
        publicationsCount: true,
        lastPublicationYear: true,
      },
    });
    return byName.find((professor) => normalizeName(professor.fullName) === normalizedCandidateName) || null;
  }

  private async resolveDepartmentId(universityId: string, departmentName?: string | null) {
    if (!departmentName) {
      return null;
    }

    const slug = slugify(departmentName);
    const existing = await this.prisma.department.findFirst({
      where: {
        universityId,
        slug,
      },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    const department = await this.prisma.department.create({
      data: {
        universityId,
        name: departmentName,
        slug,
      },
    });
    return department.id;
  }

  private async upsertProfessorSource(
    professorId: string,
    adapter: AcademicSourceAdapter,
    candidate: SourceProfessorCandidate,
  ) {
    const existing = await this.prisma.professorSource.findFirst({
      where: candidate.externalId
        ? {
            professorId,
            sourceType: adapter.sourceType,
            externalId: candidate.externalId,
          }
        : {
            professorId,
            sourceType: adapter.sourceType,
            sourceUrl: candidate.sourceUrl || null,
          },
    });

    if (existing) {
      await this.prisma.professorSource.update({
        where: { id: existing.id },
        data: {
          sourceName: adapter.name,
          sourceUrl: candidate.sourceUrl || null,
          rawPayloadJson: candidate.rawPayload as Prisma.InputJsonValue,
          scrapedAt: new Date(),
        },
      });
      return;
    }

    await this.prisma.professorSource.create({
      data: {
        professorId,
        sourceType: adapter.sourceType,
        sourceName: adapter.name,
        externalId: candidate.externalId,
        sourceUrl: candidate.sourceUrl || null,
        rawPayloadJson: candidate.rawPayload as Prisma.InputJsonValue,
      },
    });
  }

  private async upsertProfessorEmails(
    professorId: string,
    emailDomains: string[],
    candidate: SourceProfessorCandidate,
  ) {
    for (const email of candidate.emails) {
      const domain = email.email.split('@')[1]?.toLowerCase() || '';
      const normalizedEmail = email.email.toLowerCase();
      const existing = await this.prisma.professorEmail.findUnique({
        where: { email: normalizedEmail },
      });
      const domainMatched = emailDomains.map((value) => value.toLowerCase()).includes(domain);
      const sharedData = {
        professorId,
        email: normalizedEmail,
        emailHash: hashEmail(normalizedEmail),
        type: email.type || 'institutional',
        isPrimary: false,
        isVerified: false,
        verificationStatus: EmailVerificationStatus.pending,
        domainMatched,
        confidenceScore: 0,
      } satisfies Prisma.ProfessorEmailUncheckedCreateInput;

      if (existing) {
        await this.prisma.professorEmail.update({
          where: { id: existing.id },
          data: {
            professorId,
            type: sharedData.type,
            isVerified: false,
            verificationStatus: EmailVerificationStatus.pending,
            domainMatched,
          },
        });
      } else {
        await this.prisma.professorEmail.create({
          data: sharedData,
        });
      }
    }
  }

  private async upsertResearchAreas(professorId: string, researchAreas: string[], source: DataSource) {
    const uniqueNames = [...new Set(researchAreas.filter(Boolean))];
    for (const areaName of uniqueNames) {
      const slug = slugify(areaName);
      const area = await this.prisma.researchArea.upsert({
        where: { slug },
        update: { name: areaName },
        create: {
          name: areaName,
          slug,
        },
      });

      await this.prisma.professorResearchArea.upsert({
        where: {
          professorId_researchAreaId: {
            professorId,
            researchAreaId: area.id,
          },
        },
        update: {
          source,
        },
        create: {
          professorId,
          researchAreaId: area.id,
          isPrimary: false,
          source,
        },
      });
    }
  }

  private getAdapters(sourceTypes?: DataSource[]) {
    if (!sourceTypes?.length) {
      return this.adapters;
    }
    return this.adapters.filter((adapter) => sourceTypes.includes(adapter.sourceType));
  }

  private async runOpenAlexUniversityImport(
    job: Job<DiscoverProfessorsJobData>,
    adapter: AcademicSourceAdapter,
    universities: Awaited<ReturnType<DiscoveryService['loadUniversities']>>,
    counters: SyncCounters,
    failures: Array<{ source: string; universityId: string; researchAreaId: string; error: string }>,
  ) {
    for (const university of universities) {
      if (!university.openalexId) {
        continue;
      }

      let importedForUniversity = 0;
      let cursor = '*';
      const perUniversityLimit = job.data.limitPerCombination;

      while (cursor && (perUniversityLimit ? importedForUniversity < perUniversityLimit : true)) {
        const batchSize = perUniversityLimit
          ? Math.min(100, Math.max(perUniversityLimit - importedForUniversity, 1))
          : 100;

        try {
          const payload = await this.fetchOpenAlexAuthorsByUniversity(university.openalexId, cursor, batchSize);
          const authors = Array.isArray(payload.results) ? payload.results : [];

          if (authors.length === 0) {
            break;
          }

          for (const author of authors) {
            if (perUniversityLimit && importedForUniversity >= perUniversityLimit) {
              break;
            }

            const candidate = this.mapOpenAlexAuthor(author);
            if (!candidate) {
              counters.skippedCount += 1;
              continue;
            }

            counters.processedCount += 1;
            const result = await this.upsertProfessor(adapter, university, null, candidate);
            counters.createdCount += result === 'created' ? 1 : 0;
            counters.updatedCount += result === 'updated' ? 1 : 0;
            counters.skippedCount += result === 'skipped' ? 1 : 0;
            importedForUniversity += 1;
            await job.updateProgress(counters.processedCount);
          }

          cursor = payload.meta?.next_cursor || '';
        } catch (error) {
          failures.push({
            source: adapter.name,
            universityId: university.id,
            researchAreaId: 'all',
            error: (error as Error).message,
          });
          await job.log(`OpenAlex university import failed for ${university.name}: ${(error as Error).message}`);
          break;
        }
      }
    }
  }

  private async fetchOpenAlexAuthorsByUniversity(openalexInstitutionId: string, cursor: string, perPage: number) {
    const baseUrl =
      await this.systemSettings.getString('discovery.openalex.base_url')
      || process.env.OPENALEX_BASE_URL
      || 'https://api.openalex.org';
    const mailto =
      await this.systemSettings.getString('discovery.openalex.mailto')
      || process.env.OPENALEX_EMAIL
      || '';

    const url = new URL('/authors', baseUrl);
    url.searchParams.set('filter', `last_known_institutions.id:${openalexInstitutionId}`);
    url.searchParams.set('per-page', String(perPage));
    url.searchParams.set('cursor', cursor);
    if (mailto) {
      url.searchParams.set('mailto', mailto);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenAlex authors API returned ${response.status} for ${openalexInstitutionId}`);
    }

    return response.json() as Promise<{
      meta?: { next_cursor?: string | null };
      results?: OpenAlexAuthorRecord[];
    }>;
  }

  private mapOpenAlexAuthor(author: OpenAlexAuthorRecord): SourceProfessorCandidate | null {
    const fullName = (author.display_name || author.full_name || '').trim();
    if (!fullName) {
      return null;
    }

    const [firstName, ...rest] = fullName.split(/\s+/);
    const lastName = rest.length ? rest.join(' ') : null;
    const openalexId = author.ids?.openalex || author.id;
    if (!openalexId) {
      return null;
    }

    return {
      externalId: author.id,
      sourceUrl: author.id,
      fullName,
      firstName: firstName || null,
      lastName,
      position: ProfessorPosition.professor,
      openalexId,
      orcidId: author.ids?.orcid || author.orcid || null,
      researchAreas: (author.x_concepts || [])
        .map((concept) => concept.display_name)
        .filter((value): value is string => Boolean(value))
        .slice(0, 5),
      emails: [],
      hIndex: author.summary_stats?.h_index ?? null,
      citationsCount: author.cited_by_count ?? null,
      publicationsCount: author.works_count ?? null,
      rawPayload: author,
    };
  }

  private loadUniversities(universityIds?: string[]) {
    return this.prisma.university.findMany({
      where: {
        status: 'active',
        ...(universityIds?.length ? { id: { in: universityIds } } : {}),
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        openalexId: true,
        websiteUrl: true,
        emailDomains: true,
        country: { select: { isoAlpha2: true } },
      },
    }).then((rows) => rows.map((row) => ({
      id: row.id,
      name: row.name,
      openalexId: row.openalexId,
      websiteUrl: row.websiteUrl,
      emailDomains: Array.isArray(row.emailDomains) ? row.emailDomains.map(String) : [],
      countryCode: row.country.isoAlpha2,
    })));
  }

  private loadResearchAreas(researchAreaIds?: string[]) {
    return this.prisma.researchArea.findMany({
      where: researchAreaIds?.length ? { id: { in: researchAreaIds } } : undefined,
      orderBy: [{ professorCount: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        openalexConceptId: true,
      },
    });
  }
}
