import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, Prisma, SyncLogStatus, UniversityStatus, UniversityType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PaginationService } from '../../shared/pagination/pagination.service';

type OpenAlexInstitution = {
  id?: string;
  ror?: string | null;
  display_name?: string;
  display_name_alternatives?: string[];
  country_code?: string | null;
  homepage_url?: string | null;
  type?: string | null;
  ids?: {
    openalex?: string;
    ror?: string;
    grid?: string;
    wikidata?: string;
  };
  geo?: {
    city?: string | null;
  };
};

@Injectable()
export class UniversitiesService {
  private readonly logger = new Logger(UniversitiesService.name);

  constructor(private readonly prisma: PrismaService, private readonly pagination: PaginationService) {}

  async findAll(filters: any) {
    const page = this.pagination.clampPage(filters.page || 1);
    const perPage = this.pagination.clampPerPage(filters.perPage || 20);
    const where: any = { status: 'active' };
    if (filters.q) where.name = { contains: filters.q };
    if (filters.countryId) where.countryId = filters.countryId;
    if (filters.type) where.type = filters.type;
    const [universities, total] = await Promise.all([
      this.prisma.university.findMany({ where, skip: (page-1)*perPage, take: perPage, include: { country: { select: { name: true, flagEmoji: true, isoAlpha2: true } } }, orderBy: { name: 'asc' } }),
      this.prisma.university.count({ where }),
    ]);
    return this.pagination.paginate(universities, total, page, perPage);
  }

  async findOne(id: string) {
    const u = await this.prisma.university.findUnique({
      where: { id },
      include: { country: true, departments: true, _count: { select: { professors: true } } },
    });
    if (!u) throw new NotFoundException('University not found');
    return u;
  }

  async create(data: any) { return this.prisma.university.create({ data }); }
  async update(id: string, data: any) { return this.prisma.university.update({ where: { id }, data }); }
  async delete(id: string) { return this.prisma.university.update({ where: { id }, data: { status: 'inactive' } }); }

  async getCountries() {
    return this.prisma.country.findMany({ orderBy: { name: 'asc' } });
  }

  async getSyncStats() {
    const [totalActive, totalInactive, latestSync, runningSync] = await Promise.all([
      this.prisma.university.count({ where: { status: UniversityStatus.active } }),
      this.prisma.university.count({ where: { status: UniversityStatus.inactive } }),
      this.prisma.syncLog.findFirst({
        where: { queueName: 'universities-sync' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.syncLog.findFirst({
        where: { queueName: 'universities-sync', status: SyncLogStatus.running },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      totalActive,
      totalInactive,
      syncIntervalHours: 12,
      latestSync,
      runningSync,
    };
  }

  async triggerSyncFromOpenAlex(triggeredBy = 'manual') {
    const runningSync = await this.prisma.syncLog.findFirst({
      where: { queueName: 'universities-sync', status: SyncLogStatus.running },
      orderBy: { createdAt: 'desc' },
    });

    if (runningSync) {
      throw new ConflictException('A university sync is already running.');
    }

    const jobId = `universities-${Date.now()}`;
    await this.prisma.syncLog.create({
      data: {
        jobId,
        queueName: 'universities-sync',
        jobName: 'openalex-full-sync',
        status: SyncLogStatus.running,
        sourceType: DataSource.openalex,
        startedAt: new Date(),
        metadataJson: { triggeredBy } as Prisma.InputJsonValue,
      },
    });

    setTimeout(() => {
      void this.runSyncJob(jobId, triggeredBy);
    }, 0);

    return {
      jobId,
      status: 'queued',
      message: 'University sync started in the background.',
    };
  }

  async syncFromOpenAlex(triggeredBy = 'manual') {
    const runningSync = await this.prisma.syncLog.findFirst({
      where: { queueName: 'universities-sync', status: SyncLogStatus.running },
      orderBy: { createdAt: 'desc' },
    });

    if (runningSync) {
      throw new ConflictException('A university sync is already running.');
    }

    const jobId = `universities-${Date.now()}`;
    await this.prisma.syncLog.create({
      data: {
        jobId,
        queueName: 'universities-sync',
        jobName: 'openalex-full-sync',
        status: SyncLogStatus.running,
        sourceType: DataSource.openalex,
        startedAt: new Date(),
        metadataJson: { triggeredBy } as Prisma.InputJsonValue,
      },
    });

    return this.runSyncJob(jobId, triggeredBy);
  }

  private async runSyncJob(jobId: string, triggeredBy: string) {

    const startedAt = Date.now();
    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let deactivatedCount = 0;

    try {
      const countries = await this.prisma.country.findMany({
        select: { id: true, isoAlpha2: true },
      });
      const countryByCode = new Map(countries.map((country) => [country.isoAlpha2, country.id]));

      const existingUniversities = await this.prisma.university.findMany({
        select: {
          id: true,
          rorId: true,
          openalexId: true,
          name: true,
          nameAliases: true,
          countryId: true,
          city: true,
          websiteUrl: true,
          type: true,
          emailDomains: true,
          gridId: true,
          wikidataId: true,
          status: true,
        },
      });

      const existingByOpenalexId = new Map(
        existingUniversities
          .filter((row) => row.openalexId)
          .map((row) => [String(row.openalexId), row]),
      );
      const existingByRorId = new Map(
        existingUniversities
          .filter((row) => row.rorId)
          .map((row) => [String(row.rorId), row]),
      );

      const seenOpenalexIds = new Set<string>();
      const seenRorIds = new Set<string>();
      let cursor = '*';

      while (cursor) {
        const payload = await this.fetchInstitutions(cursor, 200, process.env.OPENALEX_EMAIL || 'ops@researvia.com');
        const rows = Array.isArray(payload.results) ? payload.results : [];

        if (rows.length === 0) {
          break;
        }

        const writes: Prisma.PrismaPromise<unknown>[] = [];

        for (const row of rows) {
          processedCount += 1;

          const openalexId = row.ids?.openalex || row.id || null;
          const rorId = row.ids?.ror || row.ror || null;
          const countryCode = row.country_code?.toUpperCase() || null;
          const countryId = countryCode ? countryByCode.get(countryCode) : null;
          const name = row.display_name?.trim() || '';

          if (!name || !countryId) {
            skippedCount += 1;
            continue;
          }

          if (openalexId) seenOpenalexIds.add(openalexId);
          if (rorId) seenRorIds.add(rorId);

          const aliases = this.normalizeAliases(row.display_name_alternatives);
          const nextData = {
            rorId,
            openalexId,
            name,
            nameAliases: aliases,
            countryId,
            city: row.geo?.city?.trim() || null,
            websiteUrl: row.homepage_url?.trim() || null,
            type: this.mapUniversityType(row.type),
            emailDomains: this.extractDomains(row.homepage_url),
            gridId: row.ids?.grid || null,
            wikidataId: row.ids?.wikidata || null,
            status: UniversityStatus.active,
          };

          const existing =
            (openalexId ? existingByOpenalexId.get(openalexId) : null) ||
            (rorId ? existingByRorId.get(rorId) : null) ||
            null;

          if (!existing) {
            writes.push(this.prisma.university.create({ data: nextData }));
            createdCount += 1;
            continue;
          }

          if (!this.hasUniversityChanged(existing, nextData)) {
            continue;
          }

          writes.push(
            this.prisma.university.update({
              where: { id: existing.id },
              data: nextData,
            }),
          );
          updatedCount += 1;
        }

        await this.runChunked(writes, 25);
        cursor = payload.meta?.next_cursor || '';
      }

      if (seenOpenalexIds.size > 0 || seenRorIds.size > 0) {
        const deactivateResult = await this.prisma.university.updateMany({
          where: {
            status: UniversityStatus.active,
            OR: [
              seenOpenalexIds.size
                ? { openalexId: { not: null, notIn: Array.from(seenOpenalexIds) } }
                : { openalexId: { not: null } },
              seenRorIds.size
                ? { openalexId: null, rorId: { not: null, notIn: Array.from(seenRorIds) } }
                : { openalexId: null, rorId: { not: null } },
            ],
          },
          data: { status: UniversityStatus.inactive },
        });
        deactivatedCount = deactivateResult.count;
      }

      const durationMs = Date.now() - startedAt;
      await this.prisma.syncLog.updateMany({
        where: { jobId },
        data: {
          status: SyncLogStatus.completed,
          completedAt: new Date(),
          processedCount,
          createdCount,
          updatedCount,
          skippedCount: skippedCount + deactivatedCount,
          metadataJson: {
            triggeredBy,
            deactivatedCount,
            durationMs,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        jobId,
        status: 'completed',
        processedCount,
        createdCount,
        updatedCount,
        skippedCount,
        deactivatedCount,
        durationMs,
      };
    } catch (error: any) {
      this.logger.error(`University sync failed: ${error?.message || error}`, error?.stack);
      await this.prisma.syncLog.updateMany({
        where: { jobId },
        data: {
          status: SyncLogStatus.failed,
          failedAt: new Date(),
          errorMessage: error?.message || 'University sync failed',
          processedCount,
          createdCount,
          updatedCount,
          skippedCount,
          metadataJson: { triggeredBy } as Prisma.InputJsonValue,
        },
      });
      throw error;
    }
  }

  private async fetchInstitutions(cursor: string, perPage: number, mailto: string) {
    const url = new URL('https://api.openalex.org/institutions');
    url.searchParams.set('filter', 'type:education');
    url.searchParams.set('cursor', cursor);
    url.searchParams.set('per-page', String(perPage));
    if (mailto) url.searchParams.set('mailto', mailto);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenAlex institutions API returned ${response.status}`);
    }

    return response.json() as Promise<{
      meta?: { next_cursor?: string | null; count?: number };
      results?: OpenAlexInstitution[];
    }>;
  }

  private extractDomains(websiteUrl?: string | null) {
    if (!websiteUrl) return [];
    try {
      const hostname = new URL(websiteUrl).hostname.replace(/^www\./, '').toLowerCase();
      return hostname ? [hostname] : [];
    } catch {
      return [];
    }
  }

  private normalizeAliases(value?: string[]) {
    if (!Array.isArray(value)) return Prisma.JsonNull;
    const aliases = [...new Set(value.map((item) => item.trim()).filter(Boolean))];
    return aliases.length ? aliases : Prisma.JsonNull;
  }

  private mapUniversityType(type?: string | null) {
    switch ((type || '').toLowerCase()) {
      case 'education':
      default:
        return UniversityType.other;
    }
  }

  private hasUniversityChanged(existing: any, nextData: any) {
    return (
      existing.rorId !== nextData.rorId ||
      existing.openalexId !== nextData.openalexId ||
      existing.name !== nextData.name ||
      JSON.stringify(existing.nameAliases ?? null) !== JSON.stringify(nextData.nameAliases ?? null) ||
      existing.countryId !== nextData.countryId ||
      (existing.city || null) !== nextData.city ||
      (existing.websiteUrl || null) !== nextData.websiteUrl ||
      (existing.type || null) !== nextData.type ||
      JSON.stringify(existing.emailDomains ?? null) !== JSON.stringify(nextData.emailDomains ?? null) ||
      (existing.gridId || null) !== nextData.gridId ||
      (existing.wikidataId || null) !== nextData.wikidataId ||
      existing.status !== nextData.status
    );
  }

  private async runChunked(writes: Prisma.PrismaPromise<unknown>[], size: number) {
    for (let index = 0; index < writes.length; index += size) {
      const batch = writes.slice(index, index + size);
      if (batch.length > 0) {
        await this.prisma.$transaction(batch);
      }
    }
  }
}
