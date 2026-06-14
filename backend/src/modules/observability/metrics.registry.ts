import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'researvia_' });

export const requestCounter = new Counter({
  name: 'researvia_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const errorCounter = new Counter({
  name: 'researvia_http_errors_total',
  help: 'Total HTTP error responses',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const requestDuration = new Histogram({
  name: 'researvia_http_request_duration_ms',
  help: 'Request latency in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [registry],
});

export const dbLatency = new Histogram({
  name: 'researvia_db_query_duration_ms',
  help: 'Database query latency in milliseconds',
  labelNames: ['model', 'action'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [registry],
});

export const redisLatency = new Histogram({
  name: 'researvia_redis_command_duration_ms',
  help: 'Redis command latency in milliseconds',
  labelNames: ['command'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500],
  registers: [registry],
});

export const queueCountGauge = new Gauge({
  name: 'researvia_queue_jobs',
  help: 'Queue job counts by queue and state',
  labelNames: ['queue', 'state'],
  registers: [registry],
});

export const queueFailureCounter = new Counter({
  name: 'researvia_queue_failures_total',
  help: 'Queue failures by queue',
  labelNames: ['queue'],
  registers: [registry],
});

export const emailSendCounter = new Counter({
  name: 'researvia_email_sends_total',
  help: 'Outbound email sends',
  labelNames: ['status'],
  registers: [registry],
});

export const professorRevealCounter = new Counter({
  name: 'researvia_professor_reveals_total',
  help: 'Professor email reveals',
  labelNames: ['status'],
  registers: [registry],
});

export const creditUsageCounter = new Counter({
  name: 'researvia_credit_usage_total',
  help: 'Credit usage by transaction type',
  labelNames: ['type'],
  registers: [registry],
});

export const externalHealthGauge = new Gauge({
  name: 'researvia_external_health',
  help: 'Health status for critical dependencies',
  labelNames: ['service'],
  registers: [registry],
});

export const workerHealthGauge = new Gauge({
  name: 'researvia_worker_health',
  help: 'Worker status by queue',
  labelNames: ['queue', 'status'],
  registers: [registry],
});

export const stripeWebhookFailureCounter = new Counter({
  name: 'researvia_stripe_webhook_failures_total',
  help: 'Stripe webhook failures',
  registers: [registry],
});

export function getMetricsRegistry() {
  return registry;
}
