import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { AppModule } from '../app.module';
import {
  EMAIL_FOLLOWUP_QUEUE,
  EMAIL_REPLY_SYNC_QUEUE,
  EMAIL_SEND_QUEUE,
  EMAIL_SYNC_QUEUE,
  EMAIL_TRACKING_QUEUE,
} from '../queues/email-queue.service';
import { EmailMessagesService } from '../modules/email-messages/email-messages.service';
import { InboxSyncService } from '../modules/inbox-sync/inbox-sync.service';
import { MailSettingsService } from '../modules/email-accounts/mail-settings.service';
import { getRedisConnectionOptions } from '../shared/redis/redis.config';
import { DiscoveryService } from '../modules/discovery/discovery.service';
import { FacultyScraperService } from '../modules/faculty-scraper/faculty-scraper.service';
import { ProfessorSyncService } from '../modules/professor-sync/professor-sync.service';
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
import { ScholarshipDiscoveryService } from '../modules/scholarships/scholarship-discovery.service';
import {
  SCHOLARSHIP_DEADLINE_CHECK_QUEUE,
  SCHOLARSHIP_DISCOVERY_QUEUE,
  SCHOLARSHIP_QUALITY_SCORE_QUEUE,
  SCHOLARSHIP_SYNC_QUEUE,
} from '../modules/scholarships/scholarship.constants';
import { WorkerHeartbeatService } from '../modules/system-health/worker-heartbeat.service';
import { MatchEngineService } from '../modules/ai/match-engine.service';
import {
  AI_MATCH_REFRESH_QUEUE,
  AI_PROFILE_ANALYSIS_QUEUE,
  AI_PROFESSOR_MATCHING_QUEUE,
  AI_SCHOLARSHIP_MATCHING_QUEUE,
} from '../modules/ai/ai-match.constants';
import { OutreachService } from '../modules/outreach/outreach.service';
import { OpportunityDiscoveryService } from '../modules/opportunities/opportunity-discovery.service';
import {
  OPPORTUNITY_DISCOVERY_QUEUE,
  OPPORTUNITY_QUALITY_SCORE_QUEUE,
  OPPORTUNITY_SYNC_QUEUE,
} from '../modules/opportunities/opportunity.constants';
import { BillingService } from '../modules/billing/billing.service';
import {
  BILLING_SYNC_QUEUE,
  INVOICE_SYNC_QUEUE,
  SUBSCRIPTION_EVENTS_QUEUE,
  USAGE_RESET_QUEUE,
} from '../modules/billing/billing.constants';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);
  const emailMessages = app.get(EmailMessagesService);
  const inboxSync = app.get(InboxSyncService);
  const mailSettings = app.get(MailSettingsService);
  const discoveryService = app.get(DiscoveryService);
  const facultyScraperService = app.get(FacultyScraperService);
  const professorSyncService = app.get(ProfessorSyncService);
  const scholarshipDiscoveryService = app.get(ScholarshipDiscoveryService);
  const workerHeartbeat = app.get(WorkerHeartbeatService);
  const matchEngine = app.get(MatchEngineService);
  const outreach = app.get(OutreachService);
  const opportunityDiscovery = app.get(OpportunityDiscoveryService);
  const billing = app.get(BillingService);
  const settings = await mailSettings.getSettings();
  const connection = {
    ...getRedisConnectionOptions(config),
    maxRetriesPerRequest: null,
  };

  const heartbeatQueues = new Map<string, Queue>();
  const getHeartbeatQueue = (queueName: string) => {
    const existing = heartbeatQueues.get(queueName);
    if (existing) {
      return existing;
    }

    const queue = new Queue(queueName, { connection });
    heartbeatQueues.set(queueName, queue);
    return queue;
  };

  const sendWorker = new Worker(
    EMAIL_SEND_QUEUE,
    async (job) => {
      await emailMessages.sendMessage(job.data.messageId);
    },
    { connection, concurrency: settings.emailSendConcurrency },
  );

  const syncWorker = new Worker(
    EMAIL_SYNC_QUEUE,
    async (job) => {
      await inboxSync.syncAccount(job.data.accountType, job.data.accountId, job.data.userId);
    },
    { connection, concurrency: settings.mailboxSyncConcurrency },
  );

  const followupWorker = new Worker(
    EMAIL_FOLLOWUP_QUEUE,
    async (job) => outreach.processFollowup(job.data.threadId, job.data.stage),
    { connection, concurrency: 2 },
  );

  const trackingWorker = new Worker(
    EMAIL_TRACKING_QUEUE,
    async (job) => {
      if (job.data.eventType === 'open') {
        await emailMessages.trackOpen(job.data.messageId);
      }
    },
    { connection, concurrency: 4 },
  );

  const replySyncWorker = new Worker(
    EMAIL_REPLY_SYNC_QUEUE,
    async (job) => inboxSync.syncAccount('custom', job.data.accountId, job.data.userId),
    { connection, concurrency: settings.mailboxSyncConcurrency },
  );

  const discoveryWorker = new Worker(
    PROFESSOR_DISCOVERY_QUEUE,
    async (job) => discoveryService.runDiscovery(job as any),
    { connection, concurrency: 1 },
  );

  const profileWorker = new Worker(
    PROFESSOR_PROFILE_SYNC_QUEUE,
    async (job) => professorSyncService.runProfileSync(job as any),
    { connection, concurrency: 2 },
  );

  const publicationWorker = new Worker(
    PROFESSOR_PUBLICATION_SYNC_QUEUE,
    async (job) => professorSyncService.runPublicationSync(job as any),
    { connection, concurrency: 2 },
  );

  const qualityWorker = new Worker(
    PROFESSOR_QUALITY_SCORE_QUEUE,
    async (job) => professorSyncService.runQualityScore(job as any),
    { connection, concurrency: 4 },
  );

  const dedupWorker = new Worker(
    PROFESSOR_DEDUPLICATION_QUEUE,
    async (job) => professorSyncService.runDeduplication(job as any),
    { connection, concurrency: 1 },
  );

  const facultyDiscoveryWorker = new Worker(
    FACULTY_DISCOVERY_QUEUE,
    async (job) => facultyScraperService.runFacultyDiscovery(job as any),
    { connection, concurrency: 2 },
  );

  const facultyScrapeWorker = new Worker(
    FACULTY_SCRAPE_QUEUE,
    async (job) => facultyScraperService.runFacultyScrape(job as any),
    { connection, concurrency: 2 },
  );

  const facultyEmailExtractionWorker = new Worker(
    FACULTY_EMAIL_EXTRACTION_QUEUE,
    async (job) => facultyScraperService.runFacultyEmailExtraction(job as any),
    { connection, concurrency: 2 },
  );

  const emailValidationWorker = new Worker(
    EMAIL_VALIDATION_QUEUE,
    async (job) => facultyScraperService.runEmailValidation(job as any),
    { connection, concurrency: 4 },
  );

  const scholarshipDiscoveryWorker = new Worker(
    SCHOLARSHIP_DISCOVERY_QUEUE,
    async (job) => scholarshipDiscoveryService.runDiscovery(job as any),
    { connection, concurrency: 1 },
  );

  const scholarshipSyncWorker = new Worker(
    SCHOLARSHIP_SYNC_QUEUE,
    async (job) => scholarshipDiscoveryService.runSync(job as any),
    { connection, concurrency: 2 },
  );

  const scholarshipDeadlineWorker = new Worker(
    SCHOLARSHIP_DEADLINE_CHECK_QUEUE,
    async (job) => scholarshipDiscoveryService.runDeadlineCheck(job as any),
    { connection, concurrency: 1 },
  );

  const scholarshipQualityWorker = new Worker(
    SCHOLARSHIP_QUALITY_SCORE_QUEUE,
    async (job) => scholarshipDiscoveryService.runQualityScore(job as any),
    { connection, concurrency: 2 },
  );

  const opportunityDiscoveryWorker = new Worker(
    OPPORTUNITY_DISCOVERY_QUEUE,
    async (job) => opportunityDiscovery.runDiscovery(job as any),
    { connection, concurrency: 1 },
  );

  const opportunitySyncWorker = new Worker(
    OPPORTUNITY_SYNC_QUEUE,
    async (job) => opportunityDiscovery.runSync(job as any),
    { connection, concurrency: 2 },
  );

  const opportunityQualityWorker = new Worker(
    OPPORTUNITY_QUALITY_SCORE_QUEUE,
    async (job) => opportunityDiscovery.runQualityScore(job as any),
    { connection, concurrency: 2 },
  );

  const billingSyncWorker = new Worker(
    BILLING_SYNC_QUEUE,
    async (job) => billing.runBillingSync(job.data as any),
    { connection, concurrency: 1 },
  );

  const invoiceSyncWorker = new Worker(
    INVOICE_SYNC_QUEUE,
    async (job) => billing.runInvoiceSync(job.data as any),
    { connection, concurrency: 1 },
  );

  const usageResetWorker = new Worker(
    USAGE_RESET_QUEUE,
    async (job) => billing.runUsageReset(job.data as any),
    { connection, concurrency: 1 },
  );

  const subscriptionEventsWorker = new Worker(
    SUBSCRIPTION_EVENTS_QUEUE,
    async (job) => billing.processSubscriptionEvent(job.data as any),
    { connection, concurrency: 2 },
  );

  const aiProfileWorker = new Worker(
    AI_PROFILE_ANALYSIS_QUEUE,
    async (job) => matchEngine.runProfileAnalysisJob(job.data as any),
    { connection, concurrency: 2 },
  );

  const aiProfessorMatchWorker = new Worker(
    AI_PROFESSOR_MATCHING_QUEUE,
    async (job) => matchEngine.runProfessorMatchJob(job.data as any),
    { connection, concurrency: 4 },
  );

  const aiScholarshipMatchWorker = new Worker(
    AI_SCHOLARSHIP_MATCHING_QUEUE,
    async (job) => matchEngine.runScholarshipMatchJob(job.data as any),
    { connection, concurrency: 4 },
  );

  const aiRefreshWorker = new Worker(
    AI_MATCH_REFRESH_QUEUE,
    async (job) => matchEngine.runRefreshMatchesJob(job.data as any),
    { connection, concurrency: 2 },
  );

  await Promise.all([
    workerHeartbeat.registerWorker({
      workerName: `worker:${EMAIL_SEND_QUEUE}`,
      queueName: EMAIL_SEND_QUEUE,
      worker: sendWorker,
      queue: getHeartbeatQueue(EMAIL_SEND_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${EMAIL_SYNC_QUEUE}`,
      queueName: EMAIL_SYNC_QUEUE,
      worker: syncWorker,
      queue: getHeartbeatQueue(EMAIL_SYNC_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${EMAIL_FOLLOWUP_QUEUE}`,
      queueName: EMAIL_FOLLOWUP_QUEUE,
      worker: followupWorker,
      queue: getHeartbeatQueue(EMAIL_FOLLOWUP_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${EMAIL_TRACKING_QUEUE}`,
      queueName: EMAIL_TRACKING_QUEUE,
      worker: trackingWorker,
      queue: getHeartbeatQueue(EMAIL_TRACKING_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${EMAIL_REPLY_SYNC_QUEUE}`,
      queueName: EMAIL_REPLY_SYNC_QUEUE,
      worker: replySyncWorker,
      queue: getHeartbeatQueue(EMAIL_REPLY_SYNC_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${PROFESSOR_DISCOVERY_QUEUE}`,
      queueName: PROFESSOR_DISCOVERY_QUEUE,
      worker: discoveryWorker,
      queue: getHeartbeatQueue(PROFESSOR_DISCOVERY_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${PROFESSOR_PROFILE_SYNC_QUEUE}`,
      queueName: PROFESSOR_PROFILE_SYNC_QUEUE,
      worker: profileWorker,
      queue: getHeartbeatQueue(PROFESSOR_PROFILE_SYNC_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${PROFESSOR_PUBLICATION_SYNC_QUEUE}`,
      queueName: PROFESSOR_PUBLICATION_SYNC_QUEUE,
      worker: publicationWorker,
      queue: getHeartbeatQueue(PROFESSOR_PUBLICATION_SYNC_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${PROFESSOR_QUALITY_SCORE_QUEUE}`,
      queueName: PROFESSOR_QUALITY_SCORE_QUEUE,
      worker: qualityWorker,
      queue: getHeartbeatQueue(PROFESSOR_QUALITY_SCORE_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${PROFESSOR_DEDUPLICATION_QUEUE}`,
      queueName: PROFESSOR_DEDUPLICATION_QUEUE,
      worker: dedupWorker,
      queue: getHeartbeatQueue(PROFESSOR_DEDUPLICATION_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${FACULTY_DISCOVERY_QUEUE}`,
      queueName: FACULTY_DISCOVERY_QUEUE,
      worker: facultyDiscoveryWorker,
      queue: getHeartbeatQueue(FACULTY_DISCOVERY_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${FACULTY_SCRAPE_QUEUE}`,
      queueName: FACULTY_SCRAPE_QUEUE,
      worker: facultyScrapeWorker,
      queue: getHeartbeatQueue(FACULTY_SCRAPE_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${FACULTY_EMAIL_EXTRACTION_QUEUE}`,
      queueName: FACULTY_EMAIL_EXTRACTION_QUEUE,
      worker: facultyEmailExtractionWorker,
      queue: getHeartbeatQueue(FACULTY_EMAIL_EXTRACTION_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${EMAIL_VALIDATION_QUEUE}`,
      queueName: EMAIL_VALIDATION_QUEUE,
      worker: emailValidationWorker,
      queue: getHeartbeatQueue(EMAIL_VALIDATION_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${SCHOLARSHIP_DISCOVERY_QUEUE}`,
      queueName: SCHOLARSHIP_DISCOVERY_QUEUE,
      worker: scholarshipDiscoveryWorker,
      queue: getHeartbeatQueue(SCHOLARSHIP_DISCOVERY_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${SCHOLARSHIP_SYNC_QUEUE}`,
      queueName: SCHOLARSHIP_SYNC_QUEUE,
      worker: scholarshipSyncWorker,
      queue: getHeartbeatQueue(SCHOLARSHIP_SYNC_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${SCHOLARSHIP_DEADLINE_CHECK_QUEUE}`,
      queueName: SCHOLARSHIP_DEADLINE_CHECK_QUEUE,
      worker: scholarshipDeadlineWorker,
      queue: getHeartbeatQueue(SCHOLARSHIP_DEADLINE_CHECK_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${SCHOLARSHIP_QUALITY_SCORE_QUEUE}`,
      queueName: SCHOLARSHIP_QUALITY_SCORE_QUEUE,
      worker: scholarshipQualityWorker,
      queue: getHeartbeatQueue(SCHOLARSHIP_QUALITY_SCORE_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${OPPORTUNITY_DISCOVERY_QUEUE}`,
      queueName: OPPORTUNITY_DISCOVERY_QUEUE,
      worker: opportunityDiscoveryWorker,
      queue: getHeartbeatQueue(OPPORTUNITY_DISCOVERY_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${OPPORTUNITY_SYNC_QUEUE}`,
      queueName: OPPORTUNITY_SYNC_QUEUE,
      worker: opportunitySyncWorker,
      queue: getHeartbeatQueue(OPPORTUNITY_SYNC_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${OPPORTUNITY_QUALITY_SCORE_QUEUE}`,
      queueName: OPPORTUNITY_QUALITY_SCORE_QUEUE,
      worker: opportunityQualityWorker,
      queue: getHeartbeatQueue(OPPORTUNITY_QUALITY_SCORE_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${BILLING_SYNC_QUEUE}`,
      queueName: BILLING_SYNC_QUEUE,
      worker: billingSyncWorker,
      queue: getHeartbeatQueue(BILLING_SYNC_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${INVOICE_SYNC_QUEUE}`,
      queueName: INVOICE_SYNC_QUEUE,
      worker: invoiceSyncWorker,
      queue: getHeartbeatQueue(INVOICE_SYNC_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${USAGE_RESET_QUEUE}`,
      queueName: USAGE_RESET_QUEUE,
      worker: usageResetWorker,
      queue: getHeartbeatQueue(USAGE_RESET_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${SUBSCRIPTION_EVENTS_QUEUE}`,
      queueName: SUBSCRIPTION_EVENTS_QUEUE,
      worker: subscriptionEventsWorker,
      queue: getHeartbeatQueue(SUBSCRIPTION_EVENTS_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${AI_PROFILE_ANALYSIS_QUEUE}`,
      queueName: AI_PROFILE_ANALYSIS_QUEUE,
      worker: aiProfileWorker,
      queue: getHeartbeatQueue(AI_PROFILE_ANALYSIS_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${AI_PROFESSOR_MATCHING_QUEUE}`,
      queueName: AI_PROFESSOR_MATCHING_QUEUE,
      worker: aiProfessorMatchWorker,
      queue: getHeartbeatQueue(AI_PROFESSOR_MATCHING_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${AI_SCHOLARSHIP_MATCHING_QUEUE}`,
      queueName: AI_SCHOLARSHIP_MATCHING_QUEUE,
      worker: aiScholarshipMatchWorker,
      queue: getHeartbeatQueue(AI_SCHOLARSHIP_MATCHING_QUEUE),
    }),
    workerHeartbeat.registerWorker({
      workerName: `worker:${AI_MATCH_REFRESH_QUEUE}`,
      queueName: AI_MATCH_REFRESH_QUEUE,
      worker: aiRefreshWorker,
      queue: getHeartbeatQueue(AI_MATCH_REFRESH_QUEUE),
    }),
  ]);

  const shutdown = async () => {
    await workerHeartbeat.shutdown();
    await Promise.all([
      sendWorker.close(),
      syncWorker.close(),
      followupWorker.close(),
      trackingWorker.close(),
      replySyncWorker.close(),
      discoveryWorker.close(),
      profileWorker.close(),
      publicationWorker.close(),
      qualityWorker.close(),
      dedupWorker.close(),
      facultyDiscoveryWorker.close(),
      facultyScrapeWorker.close(),
      facultyEmailExtractionWorker.close(),
      emailValidationWorker.close(),
      scholarshipDiscoveryWorker.close(),
      scholarshipSyncWorker.close(),
      scholarshipDeadlineWorker.close(),
      scholarshipQualityWorker.close(),
      opportunityDiscoveryWorker.close(),
      opportunitySyncWorker.close(),
      opportunityQualityWorker.close(),
      billingSyncWorker.close(),
      invoiceSyncWorker.close(),
      usageResetWorker.close(),
      subscriptionEventsWorker.close(),
      aiProfileWorker.close(),
      aiProfessorMatchWorker.close(),
      aiScholarshipMatchWorker.close(),
      aiRefreshWorker.close(),
      ...[...heartbeatQueues.values()].map((queue) => queue.close()),
    ]);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap();
