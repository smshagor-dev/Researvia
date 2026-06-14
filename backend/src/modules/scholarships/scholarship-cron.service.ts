import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ScholarshipDiscoveryService } from './scholarship-discovery.service';

@Injectable()
export class ScholarshipCronService {
  private readonly logger = new Logger(ScholarshipCronService.name);

  constructor(private readonly scholarshipDiscovery: ScholarshipDiscoveryService) {}

  @Cron(process.env.SCHOLARSHIP_DISCOVERY_CRON || '0 1 * * *')
  async enqueueDiscovery() {
    const result = await this.scholarshipDiscovery.queueDiscovery('system-cron');
    this.logger.log(`Queued scholarship discovery job ${result.jobId}`);
  }

  @Cron(process.env.SCHOLARSHIP_SYNC_CRON || '0 2 * * *')
  async enqueueSync() {
    const result = await this.scholarshipDiscovery.queueDetailsSync('system-cron');
    this.logger.log(`Queued scholarship sync job ${result.jobId}`);
  }

  @Cron(process.env.SCHOLARSHIP_DEADLINE_CRON || '0 3 * * *')
  async enqueueDeadlineCheck() {
    const result = await this.scholarshipDiscovery.queueDeadlineCheck('system-cron');
    this.logger.log(`Queued scholarship deadline check job ${result.jobId}`);
  }

  @Cron(process.env.SCHOLARSHIP_QUALITY_CRON || '0 4 * * *')
  async enqueueQualityScore() {
    const result = await this.scholarshipDiscovery.queueQualityScore('system-cron');
    this.logger.log(`Queued scholarship quality score job ${result.jobId}`);
  }
}
