export const PROFESSOR_DISCOVERY_QUEUE = 'professor-discovery';
export const PROFESSOR_PROFILE_SYNC_QUEUE = 'professor-profile-sync';
export const PROFESSOR_PUBLICATION_SYNC_QUEUE = 'professor-publication-sync';
export const PROFESSOR_QUALITY_SCORE_QUEUE = 'professor-quality-score';
export const PROFESSOR_DEDUPLICATION_QUEUE = 'professor-deduplication';

export const DISCOVERY_JOB_NAME = 'discover-professors';
export const PROFILE_SYNC_JOB_NAME = 'sync-professor-profiles';
export const PUBLICATION_SYNC_JOB_NAME = 'sync-professor-publications';
export const QUALITY_SCORE_JOB_NAME = 'calculate-professor-quality-score';
export const DEDUPLICATION_JOB_NAME = 'detect-professor-duplicates';

export const PROFESSOR_SYNC_QUEUE_NAMES = [
  PROFESSOR_DISCOVERY_QUEUE,
  PROFESSOR_PROFILE_SYNC_QUEUE,
  PROFESSOR_PUBLICATION_SYNC_QUEUE,
  PROFESSOR_QUALITY_SCORE_QUEUE,
  PROFESSOR_DEDUPLICATION_QUEUE,
] as const;

export type ProfessorSyncQueueName = (typeof PROFESSOR_SYNC_QUEUE_NAMES)[number];

