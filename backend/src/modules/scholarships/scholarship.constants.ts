export const SCHOLARSHIP_DISCOVERY_QUEUE = 'scholarship-discovery';
export const SCHOLARSHIP_SYNC_QUEUE = 'scholarship-sync';
export const SCHOLARSHIP_DEADLINE_CHECK_QUEUE = 'scholarship-deadline-check';
export const SCHOLARSHIP_QUALITY_SCORE_QUEUE = 'scholarship-quality-score';

export const SCHOLARSHIP_DISCOVERY_JOB = 'discover-scholarships';
export const SCHOLARSHIP_SYNC_JOB = 'sync-scholarship-details';
export const SCHOLARSHIP_DEADLINE_CHECK_JOB = 'check-scholarship-deadlines';
export const SCHOLARSHIP_QUALITY_SCORE_JOB = 'score-scholarships';

export const SCHOLARSHIP_QUEUE_NAMES = [
  SCHOLARSHIP_DISCOVERY_QUEUE,
  SCHOLARSHIP_SYNC_QUEUE,
  SCHOLARSHIP_DEADLINE_CHECK_QUEUE,
  SCHOLARSHIP_QUALITY_SCORE_QUEUE,
] as const;

export type ScholarshipQueueName = (typeof SCHOLARSHIP_QUEUE_NAMES)[number];

export const SCHOLARSHIP_SOURCE_ADAPTERS = 'SCHOLARSHIP_SOURCE_ADAPTERS';
