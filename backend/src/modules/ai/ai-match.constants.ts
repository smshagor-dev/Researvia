export const AI_PROFILE_ANALYSIS_QUEUE = 'ai-profile-analysis';
export const AI_PROFESSOR_MATCHING_QUEUE = 'ai-professor-matching';
export const AI_SCHOLARSHIP_MATCHING_QUEUE = 'ai-scholarship-matching';
export const AI_MATCH_REFRESH_QUEUE = 'ai-match-refresh';

export const AI_PROFILE_ANALYSIS_JOB = 'analyze-student-profile';
export const AI_PROFESSOR_MATCHING_JOB = 'calculate-professor-match';
export const AI_SCHOLARSHIP_MATCHING_JOB = 'calculate-scholarship-match';
export const AI_MATCH_REFRESH_JOB = 'refresh-user-matches';

export const AI_MATCH_QUEUE_NAMES = [
  AI_PROFILE_ANALYSIS_QUEUE,
  AI_PROFESSOR_MATCHING_QUEUE,
  AI_SCHOLARSHIP_MATCHING_QUEUE,
  AI_MATCH_REFRESH_QUEUE,
] as const;

export type AiMatchQueueName = (typeof AI_MATCH_QUEUE_NAMES)[number];
