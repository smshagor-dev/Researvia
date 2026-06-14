import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, WorkerStatus } from '@prisma/client';
import { Queue, Worker } from 'bullmq';
import * as os from 'os';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { buildJobActivityKey } from './system-health.constants';

type WorkerRegistration = {
  workerName: string;
  queueName: string;
  worker: Worker;
  queue: Queue;
};

type JobActivityRecord = {
  jobId: string;
  startedAt: string;
  lastProgressAt: string;
  lastProgressValue: number | string | null;
  attemptsMade: number;
};

type RegisteredWorkerState = WorkerRegistration & {
  timer?: NodeJS.Timeout;
  startedAtMs: number;
  lastJobProcessedAt: Date | null;
  lastErrorMessage: string | null;
};

@Injectable()
export class WorkerHeartbeatService {
  private readonly logger = new Logger(WorkerHeartbeatService.name);
  private readonly hostname = os.hostname();
  private readonly heartbeatIntervalMs: number;
  private readonly workerVersion: string;
  private readonly workerStates = new Map<string, RegisteredWorkerState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    config: ConfigService,
  ) {
    this.heartbeatIntervalMs = config.get<number>('WORKER_HEARTBEAT_INTERVAL_MS', 30000);
    this.workerVersion = config.get<string>('WORKER_VERSION', '1.0.0');
  }

  async registerWorker(registration: WorkerRegistration) {
    const key = this.getWorkerKey(registration.workerName, registration.queueName);
    const state: RegisteredWorkerState = {
      ...registration,
      startedAtMs: Date.now(),
      lastJobProcessedAt: null,
      lastErrorMessage: null,
    };

    this.workerStates.set(key, state);
    this.attachWorkerEvents(state);
    await this.persistHeartbeat(state, WorkerStatus.starting);

    state.timer = setInterval(() => {
      void this.persistHeartbeat(state, WorkerStatus.healthy);
    }, this.heartbeatIntervalMs);

    await this.persistHeartbeat(state, WorkerStatus.healthy);
  }

  async shutdown() {
    await Promise.all(
      [...this.workerStates.values()].map(async (state) => {
        if (state.timer) {
          clearInterval(state.timer);
        }
        await this.persistHeartbeat(state, WorkerStatus.stopped);
      }),
    );
  }

  private attachWorkerEvents(state: RegisteredWorkerState) {
    state.worker.on('active', (job) => {
      void this.recordJobActivity(state.queueName, {
        jobId: String(job.id),
        startedAt: new Date(job.processedOn || Date.now()).toISOString(),
        lastProgressAt: new Date().toISOString(),
        lastProgressValue: typeof job.progress === 'number' || typeof job.progress === 'string' ? job.progress : null,
        attemptsMade: job.attemptsMade,
      });
    });

    state.worker.on('progress', (job, progress) => {
      void this.recordJobActivity(state.queueName, {
        jobId: String(job.id),
        startedAt: new Date(job.processedOn || Date.now()).toISOString(),
        lastProgressAt: new Date().toISOString(),
        lastProgressValue: typeof progress === 'number' || typeof progress === 'string' ? progress : null,
        attemptsMade: job.attemptsMade,
      });
    });

    state.worker.on('completed', (job) => {
      state.lastJobProcessedAt = new Date();
      state.lastErrorMessage = null;
      void this.clearJobActivity(state.queueName, String(job.id));
      void this.persistHeartbeat(state, WorkerStatus.healthy);
    });

    state.worker.on('failed', (job, error) => {
      state.lastErrorMessage = error.message;
      void this.clearJobActivity(state.queueName, job?.id ? String(job.id) : null);
      void this.persistHeartbeat(state, WorkerStatus.degraded);
    });

    state.worker.on('error', (error) => {
      state.lastErrorMessage = error.message;
      void this.persistHeartbeat(state, WorkerStatus.degraded);
    });
  }

  private async persistHeartbeat(state: RegisteredWorkerState, status: WorkerStatus) {
    try {
      const counts = await state.queue.getJobCounts('active', 'waiting', 'completed', 'failed');
      const metadata: Prisma.InputJsonValue = {
        activeJobs: Number(counts.active || 0),
        waitingJobs: Number(counts.waiting || 0),
        completedJobs: Number(counts.completed || 0),
        failedJobs: Number(counts.failed || 0),
        workerVersion: this.workerVersion,
        uptimeSeconds: Math.floor((Date.now() - state.startedAtMs) / 1000),
      };

      await this.prisma.workerHeartbeat.upsert({
        where: {
          workerName_queueName_hostname: {
            workerName: state.workerName,
            queueName: state.queueName,
            hostname: this.hostname,
          },
        },
        create: {
          workerName: state.workerName,
          queueName: state.queueName,
          status,
          processId: process.pid,
          hostname: this.hostname,
          lastHeartbeatAt: new Date(),
          lastJobProcessedAt: state.lastJobProcessedAt,
          lastErrorMessage: state.lastErrorMessage,
          metadataJson: metadata,
        },
        update: {
          status,
          processId: process.pid,
          lastHeartbeatAt: new Date(),
          lastJobProcessedAt: state.lastJobProcessedAt,
          lastErrorMessage: state.lastErrorMessage,
          metadataJson: metadata,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to persist heartbeat for ${state.queueName}: ${(error as Error).message}`);
    }
  }

  private async recordJobActivity(queueName: string, record: JobActivityRecord) {
    await this.redis.set(buildJobActivityKey(queueName, record.jobId), JSON.stringify(record), 86400);
  }

  private async clearJobActivity(queueName: string, jobId: string | null) {
    if (!jobId) {
      return;
    }
    await this.redis.del(buildJobActivityKey(queueName, jobId));
  }

  private getWorkerKey(workerName: string, queueName: string) {
    return `${workerName}:${queueName}`;
  }
}
