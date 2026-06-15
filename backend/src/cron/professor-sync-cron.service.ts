import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ProfessorSyncAdminService } from '../modules/professor-sync/professor-sync-admin.service';

@Injectable()
export class ProfessorSyncCronService {
  private readonly logger = new Logger(ProfessorSyncCronService.name);

  constructor(private readonly professorSyncAdmin: ProfessorSyncAdminService) {}

  @Cron('0 */12 * * *')
  async enqueueDiscovery() {
    const result = await this.professorSyncAdmin.runDiscoverySync('system-cron', {
      sourceTypes: ['openalex', 'orcid', 'crossref', 'ror'],
    });
    this.logger.log(`Queued 12-hour professor discovery sync job ${result.jobId}`);
  }

  @Cron(process.env.PROFILE_SYNC_DAILY_CRON || '0 3 * * *')
  async enqueueProfileSync() {
    const result = await this.professorSyncAdmin.runProfileSync('system-cron');
    this.logger.log(`Queued profile sync job ${result.jobId}`);
  }

  @Cron(process.env.PUBLICATION_SYNC_DAILY_CRON || '0 4 * * *')
  async enqueuePublicationSync() {
    const result = await this.professorSyncAdmin.runPublicationSync('system-cron');
    this.logger.log(`Queued publication sync job ${result.jobId}`);
  }

  @Cron(process.env.QUALITY_SCORE_DAILY_CRON || '0 5 * * *')
  async enqueueQualityScoreRefresh() {
    const result = await this.professorSyncAdmin.runQualityScoreBatch('system-cron');
    this.logger.log(`Queued ${result.queuedJobs} quality score jobs`);
  }

  @Cron(process.env.DEDUP_WEEKLY_CRON || '0 3 * * 0')
  async enqueueDeduplication() {
    const result = await this.professorSyncAdmin.runDeduplication('system-cron');
    this.logger.log(`Queued deduplication job ${result.jobId}`);
  }
}
