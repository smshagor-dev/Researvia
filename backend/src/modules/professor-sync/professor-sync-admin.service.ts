import { Injectable } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { toPrismaJsonValue } from '../../shared/prisma/json.util';
import { ProfessorSyncQueueService } from '../queues/professor-sync-queue.service';
import {
  DEDUPLICATION_JOB_NAME,
  DISCOVERY_JOB_NAME,
  PROFESSOR_DEDUPLICATION_QUEUE,
  PROFESSOR_DISCOVERY_QUEUE,
  PROFESSOR_PROFILE_SYNC_QUEUE,
  PROFESSOR_PUBLICATION_SYNC_QUEUE,
  PROFESSOR_QUALITY_SCORE_QUEUE,
  PROFILE_SYNC_JOB_NAME,
  PUBLICATION_SYNC_JOB_NAME,
  QUALITY_SCORE_JOB_NAME,
} from './professor-sync.constants';
import { SyncLogsService } from '../sync-logs/sync-logs.service';
import { SyncLogsQueryDto } from '../sync-logs/dto/sync-log.dto';
import { RunDiscoverySyncDto } from './dto/run-professor-sync.dto';

@Injectable()
export class ProfessorSyncAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: ProfessorSyncQueueService,
    private readonly syncLogs: SyncLogsService,
  ) {}

  async runDiscoverySync(adminId: string, dto: RunDiscoverySyncDto = {}) {
    const pendingJob = await this.queueService.findFirstPendingJob(PROFESSOR_DISCOVERY_QUEUE);
    if (pendingJob) {
      return { jobId: pendingJob.id, queueName: PROFESSOR_DISCOVERY_QUEUE, status: pendingJob.state };
    }

    const job = await this.queueService.enqueueDiscovery({
      ...dto,
      sourceTypes: dto.sourceTypes as DataSource[] | undefined,
      trigger: 'admin',
      requestedBy: adminId,
    });

    await this.syncLogs.createQueuedLog({
      jobId: String(job.id),
      queueName: PROFESSOR_DISCOVERY_QUEUE,
      jobName: DISCOVERY_JOB_NAME,
      metadataJson: toPrismaJsonValue({ requestedBy: adminId, filters: dto }),
    });

    return { jobId: String(job.id), queueName: PROFESSOR_DISCOVERY_QUEUE, status: 'queued' };
  }

  async runProfileSync(adminId: string, professorId?: string) {
    if (!professorId) {
      const pendingJob = await this.queueService.findFirstPendingJob(PROFESSOR_PROFILE_SYNC_QUEUE);
      if (pendingJob) {
        return { jobId: pendingJob.id, queueName: PROFESSOR_PROFILE_SYNC_QUEUE, status: pendingJob.state };
      }
    }

    const job = await this.queueService.enqueueProfileSync({
      professorId,
      trigger: 'admin',
      requestedBy: adminId,
    });

    await this.syncLogs.createQueuedLog({
      jobId: String(job.id),
      queueName: PROFESSOR_PROFILE_SYNC_QUEUE,
      jobName: PROFILE_SYNC_JOB_NAME,
      metadataJson: toPrismaJsonValue({ requestedBy: adminId, professorId: professorId || null }),
    });

    return { jobId: String(job.id), queueName: PROFESSOR_PROFILE_SYNC_QUEUE, status: 'queued' };
  }

  async runPublicationSync(adminId: string, professorId?: string) {
    if (!professorId) {
      const pendingJob = await this.queueService.findFirstPendingJob(PROFESSOR_PUBLICATION_SYNC_QUEUE);
      if (pendingJob) {
        return { jobId: pendingJob.id, queueName: PROFESSOR_PUBLICATION_SYNC_QUEUE, status: pendingJob.state };
      }
    }

    const job = await this.queueService.enqueuePublicationSync({
      professorId,
      trigger: 'admin',
      requestedBy: adminId,
    });

    await this.syncLogs.createQueuedLog({
      jobId: String(job.id),
      queueName: PROFESSOR_PUBLICATION_SYNC_QUEUE,
      jobName: PUBLICATION_SYNC_JOB_NAME,
      metadataJson: toPrismaJsonValue({ requestedBy: adminId, professorId: professorId || null }),
    });

    return { jobId: String(job.id), queueName: PROFESSOR_PUBLICATION_SYNC_QUEUE, status: 'queued' };
  }

  async runQualityScore(adminId: string, professorId: string) {
    const job = await this.queueService.enqueueQualityScore({
      professorId,
      trigger: 'admin',
    });

    await this.syncLogs.createQueuedLog({
      jobId: String(job.id),
      queueName: PROFESSOR_QUALITY_SCORE_QUEUE,
      jobName: QUALITY_SCORE_JOB_NAME,
      metadataJson: toPrismaJsonValue({ requestedBy: adminId, professorId }),
    });

    return { jobId: String(job.id), queueName: PROFESSOR_QUALITY_SCORE_QUEUE, status: 'queued' };
  }

  async runQualityScoreBatch(requestedBy: string) {
    const professors = await this.prisma.professor.findMany({
      where: { status: 'active' },
      select: { id: true },
    });

    const jobs = await Promise.all(
      professors.map(async (professor) => {
        const job = await this.queueService.enqueueQualityScore({
          professorId: professor.id,
          trigger: 'cron',
        });

        await this.syncLogs.createQueuedLog({
          jobId: String(job.id),
          queueName: PROFESSOR_QUALITY_SCORE_QUEUE,
          jobName: QUALITY_SCORE_JOB_NAME,
          metadataJson: toPrismaJsonValue({ requestedBy, professorId: professor.id }),
        });

        return String(job.id);
      }),
    );

    return {
      queueName: PROFESSOR_QUALITY_SCORE_QUEUE,
      queuedJobs: jobs.length,
      jobIds: jobs,
    };
  }

  async runDeduplication(adminId: string) {
    const pendingJob = await this.queueService.findFirstPendingJob(PROFESSOR_DEDUPLICATION_QUEUE);
    if (pendingJob) {
      return { jobId: pendingJob.id, queueName: PROFESSOR_DEDUPLICATION_QUEUE, status: pendingJob.state };
    }

    const job = await this.queueService.enqueueDeduplication({
      trigger: 'admin',
      requestedBy: adminId,
    });

    await this.syncLogs.createQueuedLog({
      jobId: String(job.id),
      queueName: PROFESSOR_DEDUPLICATION_QUEUE,
      jobName: DEDUPLICATION_JOB_NAME,
      metadataJson: toPrismaJsonValue({ requestedBy: adminId }),
    });

    return { jobId: String(job.id), queueName: PROFESSOR_DEDUPLICATION_QUEUE, status: 'queued' };
  }

  getJobs() {
    return this.queueService.getQueueOverview();
  }

  getLogs(query: SyncLogsQueryDto) {
    return this.syncLogs.list(query);
  }

  async getSyncSummary() {
    const [latestLog, failedCount, runningCount] = await Promise.all([
      this.prisma.syncLog.findFirst({ orderBy: { createdAt: 'desc' } }),
      this.prisma.syncLog.count({ where: { status: 'failed' } }),
      this.prisma.syncLog.count({ where: { status: 'running' } }),
    ]);

    return {
      lastSyncTime: latestLog?.completedAt || latestLog?.createdAt || null,
      failedJobs: failedCount,
      runningJobs: runningCount,
    };
  }
}
