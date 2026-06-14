export const BILLING_SYNC_QUEUE = 'billing-sync';
export const INVOICE_SYNC_QUEUE = 'invoice-sync';
export const USAGE_RESET_QUEUE = 'usage-reset';
export const SUBSCRIPTION_EVENTS_QUEUE = 'subscription-events';

export const BILLING_SYNC_JOB = 'billing-sync-job';
export const INVOICE_SYNC_JOB = 'invoice-sync-job';
export const USAGE_RESET_JOB = 'usage-reset-job';
export const SUBSCRIPTION_EVENT_JOB = 'subscription-event-job';

export const BILLING_QUEUE_NAMES = [
  BILLING_SYNC_QUEUE,
  INVOICE_SYNC_QUEUE,
  USAGE_RESET_QUEUE,
  SUBSCRIPTION_EVENTS_QUEUE,
] as const;

export const ACTION_CREDIT_COSTS = {
  professor_reveal: 5,
  ai_generation: 10,
  email_send: 0,
  scholarship_unlock: 5,
  opportunity_unlock: 5,
} as const;
