import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OpportunityDiscoveryService } from './opportunity-discovery.service';

@Injectable()
export class OpportunityCronService {
  private readonly logger = new Logger(OpportunityCronService.name);

  constructor(private readonly discovery: OpportunityDiscoveryService) {}

  @Cron(process.env.OPPORTUNITY_DISCOVERY_CRON || '0 5 * * *')
  async enqueueDiscovery() {
    const result = await this.discovery.queueDiscovery('system-cron');
    this.logger.log(`Queued opportunity discovery job ${result.jobId}`);
  }

  @Cron(process.env.OPPORTUNITY_SYNC_CRON || '0 */6 * * *')
  async enqueueSync() {
    const result = await this.discovery.queueSync('system-cron');
    this.logger.log(`Queued opportunity sync job ${result.jobId}`);
  }

  @Cron(process.env.OPPORTUNITY_QUALITY_CRON || '30 */6 * * *')
  async enqueueQuality() {
    const result = await this.discovery.queueQualityScore('system-cron');
    this.logger.log(`Queued opportunity quality score job ${result.jobId}`);
  }
}
