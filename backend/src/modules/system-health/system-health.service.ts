import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SyncLogStatus, WorkerHeartbeat, WorkerStatus } from '@prisma/client';
import Stripe from 'stripe';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { ProfessorSyncQueueService } from '../queues/professor-sync-queue.service';
import { StorageService } from '../storage/storage.service';
import { MONITORED_QUEUE_NAMES, type MonitoredQueueName } from './system-health.constants';
import { SCHOLARSHIP_QUEUE_NAMES } from '../scholarships/scholarship.constants';
import { OPPORTUNITY_QUEUE_NAMES } from '../opportunities/opportunity.constants';
import {
  externalHealthGauge,
  queueCountGauge,
  workerHealthGauge,
} from '../observability/metrics.registry';

type EffectiveWorkerStatus = WorkerStatus | 'offline';

@Injectable()
export class SystemHealthService {
  private readonly heartbeatIntervalMs: number;
  private readonly offlineThresholdMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly queues: ProfessorSyncQueueService,
    private readonly storage: StorageService,
    config: ConfigService,
  ) {
    this.heartbeatIntervalMs = config.get<number>('WORKER_HEARTBEAT_INTERVAL_MS', 30000);
    this.offlineThresholdMs = config.get<number>('WORKER_OFFLINE_THRESHOLD_MS', 60000);
  }

  async getHealth() {
    const [database, redis, storage, stripe, smtp, aiProviders, workers, queues, lastSuccessfulJobAt, lastFailedJobAt] = await Promise.all([
      this.getDatabaseStatus(),
      this.getRedisStatus(),
      this.getStorageStatus(),
      this.getStripeStatus(),
      this.getSmtpStatus(),
      this.getAiProviderStatus(),
      this.getWorkers(),
      this.getQueues(),
      this.getLastSuccessfulSyncAt(),
      this.getLastFailedSyncAt(),
    ]);

    const stuckByQueue = queues.map((queue) => ({
      queueName: queue.queueName,
      count: queue.stuckJobs.count,
    }));
    const failedByQueue = queues.map((queue) => ({
      queueName: queue.queueName,
      count: queue.counts.failed,
    }));

    const stuckTotal = stuckByQueue.reduce((sum, queue) => sum + queue.count, 0);
    const failedTotal = failedByQueue.reduce((sum, queue) => sum + queue.count, 0);
    const offlineWorkers = workers.items.filter((worker) => worker.effectiveStatus === 'offline').length;
    const unhealthyWorkers = workers.items.filter((worker) => worker.effectiveStatus !== WorkerStatus.healthy).length;
    const allWorkersOffline = offlineWorkers === workers.requiredWorkers;

    let overallStatus: 'healthy' | 'degraded' | 'offline' = 'healthy';
    if (redis.status === 'offline' || allWorkersOffline) {
      overallStatus = 'offline';
    } else if (database.status !== 'healthy' || storage.status !== 'healthy' || unhealthyWorkers > 0 || stuckTotal > 0 || failedTotal > 0) {
      overallStatus = 'degraded';
    }

    externalHealthGauge.set({ service: 'database' }, database.status === 'healthy' ? 1 : 0);
    externalHealthGauge.set({ service: 'redis' }, redis.status === 'healthy' ? 1 : 0);
    externalHealthGauge.set({ service: 'storage' }, storage.status === 'healthy' ? 1 : 0);
    externalHealthGauge.set({ service: 'stripe' }, stripe.status === 'healthy' ? 1 : 0);
    externalHealthGauge.set({ service: 'smtp' }, smtp.status === 'healthy' ? 1 : 0);
    externalHealthGauge.set({ service: 'openai' }, aiProviders.openai.status === 'healthy' ? 1 : 0);
    externalHealthGauge.set({ service: 'anthropic' }, aiProviders.anthropic.status === 'healthy' ? 1 : 0);

    return {
      status: overallStatus,
      overallStatus,
      database,
      redis,
      storage,
      stripe,
      smtp,
      aiProviders,
      workers,
      queues: {
        total: queues.length,
        items: queues,
      },
      scholarships: {
        queues: queues.filter((queue) => (SCHOLARSHIP_QUEUE_NAMES as readonly string[]).includes(queue.queueName)),
        workerStatus: workers.items.filter((worker) => (SCHOLARSHIP_QUEUE_NAMES as readonly string[]).includes(worker.queueName)),
        lastScholarshipSyncAt:
          queues
            .filter((queue) => (SCHOLARSHIP_QUEUE_NAMES as readonly string[]).includes(queue.queueName))
            .map((queue) => queue.lastSuccessfulJobAt)
            .filter(Boolean)
            .sort()
            .reverse()[0] || null,
      },
      opportunities: {
        queues: queues.filter((queue) => (OPPORTUNITY_QUEUE_NAMES as readonly string[]).includes(queue.queueName)),
        workerStatus: workers.items.filter((worker) => (OPPORTUNITY_QUEUE_NAMES as readonly string[]).includes(worker.queueName)),
        lastOpportunitySyncAt:
          queues
            .filter((queue) => (OPPORTUNITY_QUEUE_NAMES as readonly string[]).includes(queue.queueName))
            .map((queue) => queue.lastSuccessfulJobAt)
            .filter(Boolean)
            .sort()
            .reverse()[0] || null,
      },
      queueOverview: queues,
      stuckJobs: {
        total: stuckTotal,
        byQueue: stuckByQueue,
      },
      failedJobs: {
        total: failedTotal,
        byQueue: failedByQueue,
      },
      alerts: this.buildAlerts({
        database,
        redis,
        stripe,
        workers,
        failedByQueue,
      }),
      metrics: this.buildMetricsSummary(queues, workers),
      lastSuccessfulJobAt,
      lastFailedJobAt,
      recommendations: this.buildRecommendations({
        redisStatus: redis.status,
        workers,
        stuckTotal,
        failedTotal,
      }),
    };
  }

  async getQueues() {
    const items = await this.queues.getQueueOverview();
    for (const queue of items) {
      queueCountGauge.set({ queue: queue.queueName, state: 'active' }, queue.counts.active);
      queueCountGauge.set({ queue: queue.queueName, state: 'waiting' }, queue.counts.waiting + queue.counts.delayed);
      queueCountGauge.set({ queue: queue.queueName, state: 'failed' }, queue.counts.failed);
      queueCountGauge.set({ queue: queue.queueName, state: 'completed' }, queue.counts.completed);
    }
    return items;
  }

  async getWorkers() {
    const rows = await this.prisma.workerHeartbeat.findMany({
      where: { queueName: { in: [...MONITORED_QUEUE_NAMES] } },
      orderBy: [{ queueName: 'asc' }, { updatedAt: 'desc' }],
    });

    const latestByQueue = new Map<string, WorkerHeartbeat>();
    for (const row of rows) {
      if (!latestByQueue.has(row.queueName)) {
        latestByQueue.set(row.queueName, row);
      }
    }

    const items = MONITORED_QUEUE_NAMES.map((queueName) => this.toWorkerSnapshot(queueName, latestByQueue.get(queueName)));
    for (const worker of items) {
      workerHealthGauge.set({ queue: worker.queueName, status: worker.effectiveStatus }, worker.effectiveStatus === 'healthy' ? 1 : 0);
    }
    return {
      requiredWorkers: MONITORED_QUEUE_NAMES.length,
      healthyWorkers: items.filter((worker) => worker.effectiveStatus === WorkerStatus.healthy).length,
      degradedWorkers: items.filter((worker) => worker.effectiveStatus === WorkerStatus.degraded || worker.effectiveStatus === WorkerStatus.starting).length,
      offlineWorkers: items.filter((worker) => worker.effectiveStatus === 'offline' || worker.effectiveStatus === WorkerStatus.stopped).length,
      items,
    };
  }

  async retryFailed(queueName: string) {
    return this.queues.retryFailed(this.queues.assertQueueName(queueName));
  }

  async cleanCompleted(queueName: string) {
    return this.queues.cleanCompleted(this.queues.assertQueueName(queueName));
  }

  async cleanFailed(queueName: string) {
    return this.queues.cleanFailed(this.queues.assertQueueName(queueName));
  }

  private async getRedisStatus() {
    try {
      await this.redis.exists('__system_health_check__');
      return { status: 'healthy' as const };
    } catch {
      return { status: 'offline' as const };
    }
  }

  private async getDatabaseStatus() {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy' as const, latencyMs: Date.now() - startedAt };
    } catch (error: any) {
      return { status: 'offline' as const, latencyMs: Date.now() - startedAt, message: error.message };
    }
  }

  private async getStorageStatus() {
    const status = await this.storage.healthCheck();
    return status;
  }

  private async getStripeStatus() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return { status: 'not_configured' as const };
    const startedAt = Date.now();
    try {
      const stripe = new Stripe(key, { apiVersion: '2024-06-20' });
      await stripe.balance.retrieve();
      return { status: 'healthy' as const, latencyMs: Date.now() - startedAt };
    } catch (error: any) {
      return { status: 'degraded' as const, latencyMs: Date.now() - startedAt, message: error.message };
    }
  }

  private async getSmtpStatus() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      return { status: 'not_configured' as const };
    }
    const startedAt = Date.now();
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.verify();
      return { status: 'healthy' as const, latencyMs: Date.now() - startedAt };
    } catch (error: any) {
      return { status: 'degraded' as const, latencyMs: Date.now() - startedAt, message: error.message };
    }
  }

  private async getAiProviderStatus() {
    return {
      openai: { status: process.env.OPENAI_API_KEY ? 'healthy' : 'not_configured' },
      anthropic: { status: process.env.ANTHROPIC_API_KEY ? 'healthy' : 'not_configured' },
    };
  }

  private async getLastSuccessfulSyncAt() {
    try {
      const result = await this.prisma.syncLog.aggregate({
        where: { status: { in: [SyncLogStatus.completed, SyncLogStatus.partial] } },
        _max: { completedAt: true },
      });
      return result._max.completedAt || null;
    } catch {
      return null;
    }
  }

  private async getLastFailedSyncAt() {
    try {
      const result = await this.prisma.syncLog.aggregate({
        where: { status: SyncLogStatus.failed },
        _max: { failedAt: true },
      });
      return result._max.failedAt || null;
    } catch {
      return null;
    }
  }

  private toWorkerSnapshot(queueName: MonitoredQueueName, row?: WorkerHeartbeat) {
    if (!row) {
      return {
        workerName: `worker:${queueName}`,
        queueName,
        hostname: null,
        processId: null,
        status: WorkerStatus.offline,
        effectiveStatus: 'offline' as EffectiveWorkerStatus,
        lastHeartbeatAt: null,
        lastHeartbeatAgeMs: null,
        lastJobProcessedAt: null,
        lastErrorMessage: null,
        metadata: null,
      };
    }

    const ageMs = Math.max(Date.now() - row.lastHeartbeatAt.getTime(), 0);
    const effectiveStatus =
      row.status === WorkerStatus.stopped
        ? WorkerStatus.stopped
        : ageMs > this.offlineThresholdMs
          ? 'offline'
          : ageMs > this.heartbeatIntervalMs * 1.5 || row.status === WorkerStatus.degraded
            ? WorkerStatus.degraded
            : row.status;

    return {
      workerName: row.workerName,
      queueName: row.queueName,
      hostname: row.hostname,
      processId: row.processId,
      status: row.status,
      effectiveStatus,
      lastHeartbeatAt: row.lastHeartbeatAt,
      lastHeartbeatAgeMs: ageMs,
      lastJobProcessedAt: row.lastJobProcessedAt,
      lastErrorMessage: row.lastErrorMessage,
      metadata: row.metadataJson,
    };
  }

  private buildRecommendations(params: {
    redisStatus: 'healthy' | 'offline';
    workers: Awaited<ReturnType<SystemHealthService['getWorkers']>>;
    stuckTotal: number;
    failedTotal: number;
  }) {
    const recommendations: string[] = [];

    if (params.redisStatus === 'offline') {
      recommendations.push('Redis is unavailable. Restore Redis connectivity before restarting workers.');
    }

    if (params.workers.offlineWorkers > 0) {
      recommendations.push('One or more required workers are offline. Check deployment replicas, logs, and process supervision.');
    }

    if (params.workers.degradedWorkers > 0) {
      recommendations.push('Some workers have delayed heartbeats. Review host load, Redis latency, and worker event loops.');
    }

    if (params.stuckTotal > 0) {
      recommendations.push('Stuck jobs were detected. Inspect long-running active jobs and consider retrying after root-cause analysis.');
    }

    if (params.failedTotal > 0) {
      recommendations.push('Failed jobs are present. Review queue failures before retrying to avoid repeated errors.');
    }

    if (recommendations.length === 0) {
      recommendations.push('System queues and workers look healthy.');
    }

    return recommendations;
  }

  private buildAlerts(params: {
    database: { status: string };
    redis: { status: string };
    stripe: { status: string };
    workers: Awaited<ReturnType<SystemHealthService['getWorkers']>>;
    failedByQueue: Array<{ queueName: string; count: number }>;
  }) {
    const alerts: Array<{ severity: 'critical' | 'warning'; key: string; message: string }> = [];

    if (params.database.status !== 'healthy') {
      alerts.push({ severity: 'critical', key: 'db_offline', message: 'Database connectivity is degraded or offline.' });
    }
    if (params.redis.status !== 'healthy') {
      alerts.push({ severity: 'critical', key: 'redis_offline', message: 'Redis is offline.' });
    }
    if (params.stripe.status === 'degraded') {
      alerts.push({ severity: 'warning', key: 'stripe_webhook_failures', message: 'Stripe health checks or webhook validation have failed recently.' });
    }
    if (params.workers.offlineWorkers > 0) {
      alerts.push({ severity: 'critical', key: 'worker_heartbeat_failures', message: 'One or more required workers are offline.' });
    }
    params.failedByQueue.filter((item) => item.count > 0).forEach((item) => {
      alerts.push({ severity: 'warning', key: `queue_failure_${item.queueName}`, message: `${item.queueName} has ${item.count} failed jobs.` });
    });

    return alerts;
  }

  private buildMetricsSummary(
    queues: Awaited<ReturnType<SystemHealthService['getQueues']>>,
    workers: Awaited<ReturnType<SystemHealthService['getWorkers']>>,
  ) {
    return {
      queueDepth: queues.reduce((sum, item) => sum + item.counts.waiting + item.counts.delayed + item.counts.active, 0),
      failedJobs: queues.reduce((sum, item) => sum + item.counts.failed, 0),
      healthyWorkers: workers.healthyWorkers,
      offlineWorkers: workers.offlineWorkers,
    };
  }
}
