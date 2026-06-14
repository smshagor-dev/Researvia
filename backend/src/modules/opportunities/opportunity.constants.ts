export const OPPORTUNITY_DISCOVERY_QUEUE = 'opportunity-discovery';
export const OPPORTUNITY_SYNC_QUEUE = 'opportunity-sync';
export const OPPORTUNITY_QUALITY_SCORE_QUEUE = 'opportunity-quality-score';

export const OPPORTUNITY_DISCOVERY_JOB = 'discover-opportunities';
export const OPPORTUNITY_SYNC_JOB = 'sync-opportunities';
export const OPPORTUNITY_QUALITY_SCORE_JOB = 'score-opportunities';

export const OPPORTUNITY_QUEUE_NAMES = [
  OPPORTUNITY_DISCOVERY_QUEUE,
  OPPORTUNITY_SYNC_QUEUE,
  OPPORTUNITY_QUALITY_SCORE_QUEUE,
] as const;

export type OpportunityQueueName = (typeof OPPORTUNITY_QUEUE_NAMES)[number];
