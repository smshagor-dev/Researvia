import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Prisma, SyncLogStatus } from '@prisma/client';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import {
  DEDUPLICATION_JOB_NAME,
  DISCOVERY_JOB_NAME,
  PROFESSOR_DEDUPLICATION_QUEUE,
  PROFESSOR_DISCOVERY_QUEUE,
  PROFESSOR_PROFILE_SYNC_QUEUE,
  PROFESSOR_PUBLICATION_SYNC_QUEUE,
  PROFESSOR_QUALITY_SCORE_QUEUE,
  PROFESSOR_SYNC_QUEUE_NAMES,
  PROFILE_SYNC_JOB_NAME,
  PUBLICATION_SYNC_JOB_NAME,
  QUALITY_SCORE_JOB_NAME,
  type ProfessorSyncQueueName,
} from '../professor-sync/professor-sync.constants';
import type {
  DeduplicateProfessorsJobData,
  DiscoverProfessorsJobData,
  ScoreProfessorQualityJobData,
  SyncProfessorProfilesJobData,
  SyncProfessorPublicationsJobData,
} from '../professor-sync/professor-sync.types';
import {
  EMAIL_VALIDATION_JOB,
  EMAIL_VALIDATION_QUEUE,
  FACULTY_DISCOVERY_QUEUE,
  FACULTY_EMAIL_EXTRACTION_QUEUE,
  FACULTY_SCRAPER_QUEUE_NAMES,
  FACULTY_DISCOVERY_JOB,
  FACULTY_EMAIL_EXTRACTION_JOB,
  FACULTY_SCRAPE_QUEUE,
  FACULTY_SCRAPE_JOB,
} from '../faculty-scraper/faculty-scraper.constants';
import type {
  EmailValidationJobData,
  FacultyDiscoveryJobData,
  FacultyEmailExtractionJobData,
  FacultyScrapeJobData,
} from '../faculty-scraper/faculty-scraper.types';
import {
  SCHOLARSHIP_DEADLINE_CHECK_JOB,
  SCHOLARSHIP_DEADLINE_CHECK_QUEUE,
  SCHOLARSHIP_DISCOVERY_JOB,
  SCHOLARSHIP_DISCOVERY_QUEUE,
  SCHOLARSHIP_QUALITY_SCORE_JOB,
  SCHOLARSHIP_QUALITY_SCORE_QUEUE,
  SCHOLARSHIP_QUEUE_NAMES,
  SCHOLARSHIP_SYNC_JOB,
  SCHOLARSHIP_SYNC_QUEUE,
  type ScholarshipQueueName,
} from '../scholarships/scholarship.constants';
import type {
  ScholarshipDeadlineCheckJobData,
  ScholarshipDiscoveryJobData,
  ScholarshipQualityScoreJobData,
  ScholarshipSyncJobData,
} from '../scholarships/scholarship.types';
import {
  BILLING_QUEUE_NAMES,
  BILLING_SYNC_JOB,
  BILLING_SYNC_QUEUE,
  INVOICE_SYNC_JOB,
  INVOICE_SYNC_QUEUE,
  SUBSCRIPTION_EVENT_JOB,
  SUBSCRIPTION_EVENTS_QUEUE,
  USAGE_RESET_JOB,
  USAGE_RESET_QUEUE,
} from '../billing/billing.constants';
import type {
  BillingSyncJobData,
  InvoiceSyncJobData,
  SubscriptionEventJobData,
  UsageResetJobData,
} from '../billing/billing.types';
import {
  OPPORTUNITY_DISCOVERY_JOB,
  OPPORTUNITY_DISCOVERY_QUEUE,
  OPPORTUNITY_QUALITY_SCORE_JOB,
  OPPORTUNITY_QUALITY_SCORE_QUEUE,
  OPPORTUNITY_QUEUE_NAMES,
  OPPORTUNITY_SYNC_JOB,
  OPPORTUNITY_SYNC_QUEUE,
  type OpportunityQueueName,
} from '../opportunities/opportunity.constants';
import type {
  OpportunityDiscoveryJobData,
  OpportunityQualityScoreJobData,
  OpportunitySyncJobData,
} from '../opportunities/opportunity.types';
import {
  AI_MATCH_REFRESH_JOB,
  AI_MATCH_REFRESH_QUEUE,
  AI_PROFILE_ANALYSIS_JOB,
  AI_PROFILE_ANALYSIS_QUEUE,
  AI_PROFESSOR_MATCHING_JOB,
  AI_PROFESSOR_MATCHING_QUEUE,
  AI_SCHOLARSHIP_MATCHING_JOB,
  AI_SCHOLARSHIP_MATCHING_QUEUE,
  AI_MATCH_QUEUE_NAMES,
  type AiMatchQueueName,
} from '../ai/ai-match.constants';
import type {
  AnalyzeStudentProfileJobData,
  CalculateProfessorMatchJobData,
  CalculateScholarshipMatchJobData,
  RefreshUserMatchesJobData,
} from '../ai/ai-match.types';
import { buildJobActivityKey, MONITORED_QUEUE_NAMES, type MonitoredQueueName } from '../system-health/system-health.constants';

type JobActivityRecord = {
  jobId: string;
  startedAt: string;
  lastProgressAt: string;
  lastProgressValue: number | string | null;
  attemptsMade: number;
};

@Injectable()
export class ProfessorSyncQueueService {
  private readonly stuckThresholdMs: number;

  constructor(
    @InjectQueue(PROFESSOR_DISCOVERY_QUEUE)
    private readonly discoveryQueue: Queue<DiscoverProfessorsJobData>,
    @InjectQueue(PROFESSOR_PROFILE_SYNC_QUEUE)
    private readonly profileSyncQueue: Queue<SyncProfessorProfilesJobData>,
    @InjectQueue(PROFESSOR_PUBLICATION_SYNC_QUEUE)
    private readonly publicationSyncQueue: Queue<SyncProfessorPublicationsJobData>,
    @InjectQueue(PROFESSOR_QUALITY_SCORE_QUEUE)
    private readonly qualityScoreQueue: Queue<ScoreProfessorQualityJobData>,
    @InjectQueue(PROFESSOR_DEDUPLICATION_QUEUE)
    private readonly deduplicationQueue: Queue<DeduplicateProfessorsJobData>,
    @InjectQueue(FACULTY_DISCOVERY_QUEUE)
    private readonly facultyDiscoveryQueue: Queue<FacultyDiscoveryJobData>,
    @InjectQueue(FACULTY_SCRAPE_QUEUE)
    private readonly facultyScrapeQueue: Queue<FacultyScrapeJobData>,
    @InjectQueue(FACULTY_EMAIL_EXTRACTION_QUEUE)
    private readonly facultyEmailExtractionQueue: Queue<FacultyEmailExtractionJobData>,
    @InjectQueue(EMAIL_VALIDATION_QUEUE)
    private readonly emailValidationQueue: Queue<EmailValidationJobData>,
    @InjectQueue(SCHOLARSHIP_DISCOVERY_QUEUE)
    private readonly scholarshipDiscoveryQueue: Queue<ScholarshipDiscoveryJobData>,
    @InjectQueue(SCHOLARSHIP_SYNC_QUEUE)
    private readonly scholarshipSyncQueue: Queue<ScholarshipSyncJobData>,
    @InjectQueue(SCHOLARSHIP_DEADLINE_CHECK_QUEUE)
    private readonly scholarshipDeadlineCheckQueue: Queue<ScholarshipDeadlineCheckJobData>,
    @InjectQueue(SCHOLARSHIP_QUALITY_SCORE_QUEUE)
    private readonly scholarshipQualityScoreQueue: Queue<ScholarshipQualityScoreJobData>,
    @InjectQueue(OPPORTUNITY_DISCOVERY_QUEUE)
    private readonly opportunityDiscoveryQueue: Queue<OpportunityDiscoveryJobData>,
    @InjectQueue(OPPORTUNITY_SYNC_QUEUE)
    private readonly opportunitySyncQueue: Queue<OpportunitySyncJobData>,
    @InjectQueue(OPPORTUNITY_QUALITY_SCORE_QUEUE)
    private readonly opportunityQualityScoreQueue: Queue<OpportunityQualityScoreJobData>,
    @InjectQueue(AI_PROFILE_ANALYSIS_QUEUE)
    private readonly aiProfileAnalysisQueue: Queue<AnalyzeStudentProfileJobData>,
    @InjectQueue(AI_PROFESSOR_MATCHING_QUEUE)
    private readonly aiProfessorMatchingQueue: Queue<CalculateProfessorMatchJobData>,
    @InjectQueue(AI_SCHOLARSHIP_MATCHING_QUEUE)
    private readonly aiScholarshipMatchingQueue: Queue<CalculateScholarshipMatchJobData>,
    @InjectQueue(AI_MATCH_REFRESH_QUEUE)
    private readonly aiMatchRefreshQueue: Queue<RefreshUserMatchesJobData>,
    @InjectQueue(BILLING_SYNC_QUEUE)
    private readonly billingSyncQueue: Queue<BillingSyncJobData>,
    @InjectQueue(INVOICE_SYNC_QUEUE)
    private readonly invoiceSyncQueue: Queue<InvoiceSyncJobData>,
    @InjectQueue(USAGE_RESET_QUEUE)
    private readonly usageResetQueue: Queue<UsageResetJobData>,
    @InjectQueue(SUBSCRIPTION_EVENTS_QUEUE)
    private readonly subscriptionEventsQueue: Queue<SubscriptionEventJobData>,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    config: ConfigService,
  ) {
    this.stuckThresholdMs = config.get<number>('QUEUE_STUCK_JOB_THRESHOLD_MS', 900000);
  }

  enqueueDiscovery(data: DiscoverProfessorsJobData) {
    return this.discoveryQueue.add(DISCOVERY_JOB_NAME, data);
  }

  enqueueProfileSync(data: SyncProfessorProfilesJobData) {
    return this.profileSyncQueue.add(PROFILE_SYNC_JOB_NAME, data, {
      jobId: data.professorId ? `profile-${data.professorId}` : undefined,
    });
  }

  enqueuePublicationSync(data: SyncProfessorPublicationsJobData) {
    return this.publicationSyncQueue.add(PUBLICATION_SYNC_JOB_NAME, data, {
      jobId: data.professorId ? `publication-${data.professorId}` : undefined,
    });
  }

  enqueueQualityScore(data: ScoreProfessorQualityJobData) {
    return this.qualityScoreQueue.add(QUALITY_SCORE_JOB_NAME, data, {
      jobId: `quality-${data.professorId}`,
    });
  }

  enqueueDeduplication(data: DeduplicateProfessorsJobData) {
    return this.deduplicationQueue.add(DEDUPLICATION_JOB_NAME, data, {
      jobId: 'deduplication-global',
    });
  }

  enqueueFacultyDiscovery(data: FacultyDiscoveryJobData) {
    return this.facultyDiscoveryQueue.add(FACULTY_DISCOVERY_JOB, data, {
      jobId: `faculty-discovery-${data.professorId}`,
    });
  }

  enqueueFacultyScrape(data: FacultyScrapeJobData) {
    return this.facultyScrapeQueue.add(FACULTY_SCRAPE_JOB, data, {
      jobId: `faculty-scrape-${data.professorId}`,
    });
  }

  enqueueFacultyEmailExtraction(data: FacultyEmailExtractionJobData) {
    return this.facultyEmailExtractionQueue.add(FACULTY_EMAIL_EXTRACTION_JOB, data);
  }

  enqueueEmailValidation(data: EmailValidationJobData) {
    return this.emailValidationQueue.add(EMAIL_VALIDATION_JOB, data, {
      jobId: `email-validation-${data.professorId}-${Buffer.from(data.email).toString('hex').slice(0, 24)}`,
    });
  }

  enqueueScholarshipDiscovery(data: ScholarshipDiscoveryJobData) {
    return this.scholarshipDiscoveryQueue.add(SCHOLARSHIP_DISCOVERY_JOB, data, {
      jobId: `scholarship-discovery-${Date.now()}`,
    });
  }

  enqueueScholarshipSync(data: ScholarshipSyncJobData) {
    return this.scholarshipSyncQueue.add(SCHOLARSHIP_SYNC_JOB, data, {
      jobId: data.scholarshipId ? `scholarship-sync-${data.scholarshipId}` : `scholarship-sync-${Date.now()}`,
    });
  }

  enqueueScholarshipDeadlineCheck(data: ScholarshipDeadlineCheckJobData) {
    return this.scholarshipDeadlineCheckQueue.add(SCHOLARSHIP_DEADLINE_CHECK_JOB, data, {
      jobId: `scholarship-deadline-${Date.now()}`,
    });
  }

  enqueueScholarshipQualityScore(data: ScholarshipQualityScoreJobData) {
    return this.scholarshipQualityScoreQueue.add(SCHOLARSHIP_QUALITY_SCORE_JOB, data, {
      jobId: data.scholarshipId ? `scholarship-quality-${data.scholarshipId}` : `scholarship-quality-${Date.now()}`,
    });
  }

  enqueueOpportunityDiscovery(data: OpportunityDiscoveryJobData) {
    return this.opportunityDiscoveryQueue.add(OPPORTUNITY_DISCOVERY_JOB, data, {
      jobId: `opportunity-discovery-${Date.now()}`,
    });
  }

  enqueueOpportunitySync(data: OpportunitySyncJobData) {
    return this.opportunitySyncQueue.add(OPPORTUNITY_SYNC_JOB, data, {
      jobId: data.opportunityId ? `opportunity-sync-${data.opportunityId}` : `opportunity-sync-${Date.now()}`,
    });
  }

  enqueueOpportunityQualityScore(data: OpportunityQualityScoreJobData) {
    return this.opportunityQualityScoreQueue.add(OPPORTUNITY_QUALITY_SCORE_JOB, data, {
      jobId: data.opportunityId ? `opportunity-quality-${data.opportunityId}` : `opportunity-quality-${Date.now()}`,
    });
  }

  enqueueAiProfileAnalysis(data: AnalyzeStudentProfileJobData) {
    return this.aiProfileAnalysisQueue.add(AI_PROFILE_ANALYSIS_JOB, data, {
      jobId: `ai-profile-${data.userId}`,
    });
  }

  enqueueAiProfessorMatch(data: CalculateProfessorMatchJobData) {
    return this.aiProfessorMatchingQueue.add(AI_PROFESSOR_MATCHING_JOB, data, {
      jobId: `ai-professor-${data.userId}-${data.professorId}`,
    });
  }

  enqueueAiScholarshipMatch(data: CalculateScholarshipMatchJobData) {
    return this.aiScholarshipMatchingQueue.add(AI_SCHOLARSHIP_MATCHING_JOB, data, {
      jobId: `ai-scholarship-${data.userId}-${data.scholarshipId}`,
    });
  }

  enqueueAiMatchRefresh(data: RefreshUserMatchesJobData) {
    return this.aiMatchRefreshQueue.add(AI_MATCH_REFRESH_JOB, data, {
      jobId: `ai-refresh-${data.userId}-${data.targetType || 'all'}`,
    });
  }

  enqueueBillingSync(data: BillingSyncJobData) {
    return this.billingSyncQueue.add(BILLING_SYNC_JOB, data, {
      jobId: `billing-sync-${Date.now()}`,
    });
  }

  enqueueInvoiceSync(data: InvoiceSyncJobData) {
    return this.invoiceSyncQueue.add(INVOICE_SYNC_JOB, data, {
      jobId: `invoice-sync-${Date.now()}`,
    });
  }

  enqueueUsageReset(data: UsageResetJobData) {
    return this.usageResetQueue.add(USAGE_RESET_JOB, data, {
      jobId: `usage-reset-${new Date().toISOString().slice(0, 7)}`,
    });
  }

  enqueueSubscriptionEvent(data: SubscriptionEventJobData) {
    return this.subscriptionEventsQueue.add(SUBSCRIPTION_EVENT_JOB, data, {
      jobId: `subscription-event-${Date.now()}`,
    });
  }

  async getQueueOverview() {
    return Promise.all(MONITORED_QUEUE_NAMES.map((queueName) => this.getQueueSnapshot(queueName)));
  }

  async getQueueSnapshot(queueName: MonitoredQueueName) {
    const queue = this.getQueue(queueName);
    const [counts, jobs, stuckJobs, latestSuccess, latestFailure] = await Promise.all([
      queue.getJobCounts('active', 'completed', 'delayed', 'failed', 'waiting'),
      queue.getJobs(['active', 'waiting', 'delayed', 'failed', 'completed'], 0, 9, true),
      this.getStuckJobs(queueName),
      this.prisma.syncLog.aggregate({
        where: { queueName, status: { in: [SyncLogStatus.completed, SyncLogStatus.partial] } },
        _max: { completedAt: true },
      }),
      this.prisma.syncLog.aggregate({
        where: { queueName, status: SyncLogStatus.failed },
        _max: { failedAt: true },
      }),
    ]);

    const latencyMs = await this.getQueueLatencyMs(queue);

    return {
      queueName,
      counts: {
        active: Number(counts.active || 0),
        completed: Number(counts.completed || 0),
        delayed: Number(counts.delayed || 0),
        failed: Number(counts.failed || 0),
        waiting: Number(counts.waiting || 0),
      },
      queueLatencyMs: latencyMs,
      stuckJobs: {
        count: stuckJobs.length,
        jobs: stuckJobs,
      },
      lastSuccessfulJobAt: latestSuccess._max.completedAt || null,
      lastFailedJobAt: latestFailure._max.failedAt || null,
      jobs: await Promise.all(jobs.map((job) => this.toSafeJobSummary(job))),
    };
  }

  async getStuckJobs(queueName: MonitoredQueueName) {
    const queue = this.getQueue(queueName);
    const activeJobs = await queue.getJobs(['active'], 0, 199, true);
    const now = Date.now();
    const stuckJobs = await Promise.all(
      activeJobs.map(async (job) => {
        const processedOn = job.processedOn || job.timestamp || now;
        const activeForMs = Math.max(now - processedOn, 0);
        const activity = await this.getJobActivity(queueName, String(job.id));
        const lastProgressAt = activity?.lastProgressAt ? new Date(activity.lastProgressAt).getTime() : processedOn;
        const totalAttempts = Math.max(job.opts.attempts ?? 1, 1);
        const retriesRemaining = Math.max(totalAttempts - job.attemptsMade - 1, 0);

        if (activeForMs < this.stuckThresholdMs) {
          return null;
        }

        if (now - lastProgressAt < this.stuckThresholdMs) {
          return null;
        }

        if (retriesRemaining <= 0) {
          return null;
        }

        return {
          id: String(job.id),
          name: job.name,
          attemptsMade: job.attemptsMade,
          retriesRemaining,
          activeForMs,
          lastProgressAt: new Date(lastProgressAt).toISOString(),
          lastProgressValue: activity?.lastProgressValue ?? null,
          processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        };
      }),
    );

    return stuckJobs.filter(Boolean);
  }

  async retryFailed(queueName: MonitoredQueueName) {
    const queue = this.getQueue(queueName);
    const failedJobs = await queue.getJobs(['failed'], 0, 999, true);
    let retriedCount = 0;

    for (const job of failedJobs) {
      try {
        await job.retry();
        retriedCount += 1;
      } catch {
        continue;
      }
    }

    return {
      queueName,
      retriedCount,
      failedCount: failedJobs.length,
    };
  }

  async cleanCompleted(queueName: MonitoredQueueName) {
    return this.cleanQueue(queueName, 'completed');
  }

  async cleanFailed(queueName: MonitoredQueueName) {
    return this.cleanQueue(queueName, 'failed');
  }

  getMonitoredQueueNames() {
    return [...MONITORED_QUEUE_NAMES];
  }

  async findFirstPendingJob(queueName: ProfessorSyncQueueName | ScholarshipQueueName | OpportunityQueueName) {
    const queue = this.getQueue(queueName);
    const [job] = await queue.getJobs(['active', 'waiting', 'delayed'], 0, 0, true);

    if (!job) {
      return null;
    }

    return {
      id: String(job.id),
      name: job.name,
      state: await job.getState(),
    };
  }

  getAiQueueNames() {
    return [...AI_MATCH_QUEUE_NAMES];
  }

  private async cleanQueue(queueName: MonitoredQueueName, type: 'completed' | 'failed') {
    const queue = this.getQueue(queueName);
    let removedCount = 0;

    while (true) {
      const removed = await queue.clean(0, 1000, type);
      removedCount += removed.length;
      if (removed.length < 1000) {
        break;
      }
    }

    return { queueName, type, removedCount };
  }

  private async getQueueLatencyMs(queue: Queue) {
    const [waitingJob] = await queue.getJobs(['waiting', 'delayed'], 0, 0, true);
    if (!waitingJob) {
      return 0;
    }

    return Math.max(Date.now() - waitingJob.timestamp, 0);
  }

  private async toSafeJobSummary(job: Job) {
    return {
      id: String(job.id),
      name: job.name,
      progress: typeof job.progress === 'number' || typeof job.progress === 'string' ? job.progress : null,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason ? String(job.failedReason).slice(0, 500) : null,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn || null,
      processedOn: job.processedOn || null,
      state: await job.getState(),
    };
  }

  private async getJobActivity(queueName: string, jobId: string) {
    try {
      const raw = await this.redis.get(buildJobActivityKey(queueName, jobId));
      return raw ? (JSON.parse(raw) as JobActivityRecord) : null;
    } catch {
      return null;
    }
  }

  private getQueue(queueName: MonitoredQueueName | ProfessorSyncQueueName | (typeof FACULTY_SCRAPER_QUEUE_NAMES)[number] | ScholarshipQueueName | OpportunityQueueName | AiMatchQueueName | (typeof BILLING_QUEUE_NAMES)[number]) {
    switch (queueName) {
      case PROFESSOR_DISCOVERY_QUEUE:
        return this.discoveryQueue;
      case PROFESSOR_PROFILE_SYNC_QUEUE:
        return this.profileSyncQueue;
      case PROFESSOR_PUBLICATION_SYNC_QUEUE:
        return this.publicationSyncQueue;
      case PROFESSOR_QUALITY_SCORE_QUEUE:
        return this.qualityScoreQueue;
      case PROFESSOR_DEDUPLICATION_QUEUE:
        return this.deduplicationQueue;
      case FACULTY_DISCOVERY_QUEUE:
        return this.facultyDiscoveryQueue;
      case FACULTY_SCRAPE_QUEUE:
        return this.facultyScrapeQueue;
      case FACULTY_EMAIL_EXTRACTION_QUEUE:
        return this.facultyEmailExtractionQueue;
      case EMAIL_VALIDATION_QUEUE:
        return this.emailValidationQueue;
      case SCHOLARSHIP_DISCOVERY_QUEUE:
        return this.scholarshipDiscoveryQueue;
      case SCHOLARSHIP_SYNC_QUEUE:
        return this.scholarshipSyncQueue;
      case SCHOLARSHIP_DEADLINE_CHECK_QUEUE:
        return this.scholarshipDeadlineCheckQueue;
      case SCHOLARSHIP_QUALITY_SCORE_QUEUE:
        return this.scholarshipQualityScoreQueue;
      case OPPORTUNITY_DISCOVERY_QUEUE:
        return this.opportunityDiscoveryQueue;
      case OPPORTUNITY_SYNC_QUEUE:
        return this.opportunitySyncQueue;
      case OPPORTUNITY_QUALITY_SCORE_QUEUE:
        return this.opportunityQualityScoreQueue;
      case AI_PROFILE_ANALYSIS_QUEUE:
        return this.aiProfileAnalysisQueue;
      case AI_PROFESSOR_MATCHING_QUEUE:
        return this.aiProfessorMatchingQueue;
      case AI_SCHOLARSHIP_MATCHING_QUEUE:
        return this.aiScholarshipMatchingQueue;
      case AI_MATCH_REFRESH_QUEUE:
        return this.aiMatchRefreshQueue;
      case BILLING_SYNC_QUEUE:
        return this.billingSyncQueue;
      case INVOICE_SYNC_QUEUE:
        return this.invoiceSyncQueue;
      case USAGE_RESET_QUEUE:
        return this.usageResetQueue;
      case SUBSCRIPTION_EVENTS_QUEUE:
        return this.subscriptionEventsQueue;
      default:
        throw new BadRequestException(`Unknown queue: ${queueName}`);
    }
  }

  assertQueueName(queueName: string): MonitoredQueueName {
    if (!(MONITORED_QUEUE_NAMES as readonly string[]).includes(queueName)) {
      throw new BadRequestException(`Unsupported queue: ${queueName}`);
    }

    return queueName as MonitoredQueueName;
  }
}
