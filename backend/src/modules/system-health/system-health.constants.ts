import {
  PROFESSOR_SYNC_QUEUE_NAMES,
} from '../professor-sync/professor-sync.constants';
import { FACULTY_SCRAPER_QUEUE_NAMES } from '../faculty-scraper/faculty-scraper.constants';
import { SCHOLARSHIP_QUEUE_NAMES } from '../scholarships/scholarship.constants';
import { OPPORTUNITY_QUEUE_NAMES } from '../opportunities/opportunity.constants';
import { BILLING_QUEUE_NAMES } from '../billing/billing.constants';
import { AI_MATCH_QUEUE_NAMES } from '../ai/ai-match.constants';
import { OUTREACH_QUEUE_NAMES } from '../../queues/email-queue.service';

export const MONITORED_QUEUE_NAMES = [
  ...PROFESSOR_SYNC_QUEUE_NAMES,
  ...FACULTY_SCRAPER_QUEUE_NAMES,
  ...SCHOLARSHIP_QUEUE_NAMES,
  ...OPPORTUNITY_QUEUE_NAMES,
  ...BILLING_QUEUE_NAMES,
  ...AI_MATCH_QUEUE_NAMES,
  ...OUTREACH_QUEUE_NAMES,
] as const;

export type MonitoredQueueName = (typeof MONITORED_QUEUE_NAMES)[number];

export const JOB_ACTIVITY_KEY_PREFIX = 'system-health:job-activity';

export function buildJobActivityKey(queueName: string, jobId: string) {
  return `${JOB_ACTIVITY_KEY_PREFIX}:${queueName}:${jobId}`;
}
