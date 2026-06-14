import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailQueueService } from './email-queue.service';
import {
  EMAIL_FOLLOWUP_QUEUE,
  EMAIL_REPLY_SYNC_QUEUE,
  EMAIL_SEND_QUEUE,
  EMAIL_SYNC_QUEUE,
  EMAIL_TRACKING_QUEUE,
} from './email-queue.service';
import { EmailAccountsModule } from '../modules/email-accounts/email-accounts.module';
import {
  PROFESSOR_DEDUPLICATION_QUEUE,
  PROFESSOR_DISCOVERY_QUEUE,
  PROFESSOR_PROFILE_SYNC_QUEUE,
  PROFESSOR_PUBLICATION_SYNC_QUEUE,
  PROFESSOR_QUALITY_SCORE_QUEUE,
} from '../modules/professor-sync/professor-sync.constants';
import {
  EMAIL_VALIDATION_QUEUE,
  FACULTY_DISCOVERY_QUEUE,
  FACULTY_EMAIL_EXTRACTION_QUEUE,
  FACULTY_SCRAPE_QUEUE,
} from '../modules/faculty-scraper/faculty-scraper.constants';
import {
  SCHOLARSHIP_DEADLINE_CHECK_QUEUE,
  SCHOLARSHIP_DISCOVERY_QUEUE,
  SCHOLARSHIP_QUALITY_SCORE_QUEUE,
  SCHOLARSHIP_SYNC_QUEUE,
} from '../modules/scholarships/scholarship.constants';
import {
  OPPORTUNITY_DISCOVERY_QUEUE,
  OPPORTUNITY_QUALITY_SCORE_QUEUE,
  OPPORTUNITY_SYNC_QUEUE,
} from '../modules/opportunities/opportunity.constants';
import {
  BILLING_SYNC_QUEUE,
  INVOICE_SYNC_QUEUE,
  SUBSCRIPTION_EVENTS_QUEUE,
  USAGE_RESET_QUEUE,
} from '../modules/billing/billing.constants';
import {
  AI_MATCH_REFRESH_QUEUE,
  AI_PROFILE_ANALYSIS_QUEUE,
  AI_PROFESSOR_MATCHING_QUEUE,
  AI_SCHOLARSHIP_MATCHING_QUEUE,
} from '../modules/ai/ai-match.constants';
import { ProfessorSyncQueueService } from '../modules/queues/professor-sync-queue.service';
import { getRedisConnectionOptions } from '../shared/redis/redis.config';

@Module({
  imports: [
    ConfigModule,
    EmailAccountsModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          ...getRedisConnectionOptions(config),
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 500,
          removeOnFail: 2000,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: PROFESSOR_DISCOVERY_QUEUE },
      { name: PROFESSOR_PROFILE_SYNC_QUEUE },
      { name: PROFESSOR_PUBLICATION_SYNC_QUEUE },
      { name: PROFESSOR_QUALITY_SCORE_QUEUE },
      { name: PROFESSOR_DEDUPLICATION_QUEUE },
      { name: FACULTY_DISCOVERY_QUEUE },
      { name: FACULTY_SCRAPE_QUEUE },
      { name: FACULTY_EMAIL_EXTRACTION_QUEUE },
      { name: EMAIL_VALIDATION_QUEUE },
      { name: SCHOLARSHIP_DISCOVERY_QUEUE },
      { name: SCHOLARSHIP_SYNC_QUEUE },
      { name: SCHOLARSHIP_DEADLINE_CHECK_QUEUE },
      { name: SCHOLARSHIP_QUALITY_SCORE_QUEUE },
      { name: OPPORTUNITY_DISCOVERY_QUEUE },
      { name: OPPORTUNITY_SYNC_QUEUE },
      { name: OPPORTUNITY_QUALITY_SCORE_QUEUE },
      { name: BILLING_SYNC_QUEUE },
      { name: INVOICE_SYNC_QUEUE },
      { name: USAGE_RESET_QUEUE },
      { name: SUBSCRIPTION_EVENTS_QUEUE },
      { name: AI_PROFILE_ANALYSIS_QUEUE },
      { name: AI_PROFESSOR_MATCHING_QUEUE },
      { name: AI_SCHOLARSHIP_MATCHING_QUEUE },
      { name: AI_MATCH_REFRESH_QUEUE },
      { name: EMAIL_SEND_QUEUE },
      { name: EMAIL_FOLLOWUP_QUEUE },
      { name: EMAIL_SYNC_QUEUE },
      { name: EMAIL_TRACKING_QUEUE },
      { name: EMAIL_REPLY_SYNC_QUEUE },
    ),
  ],
  providers: [EmailQueueService, ProfessorSyncQueueService],
  exports: [EmailQueueService, ProfessorSyncQueueService, BullModule],
})
export class QueuesModule {}
