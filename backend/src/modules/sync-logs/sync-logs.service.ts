import { Injectable } from '@nestjs/common';
import { DataSource, Prisma, SyncLogStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { SyncLogsQueryDto } from './dto/sync-log.dto';

type CounterUpdate = {
  processedCount?: number;
  createdCount?: number;
  updatedCount?: number;
  skippedCount?: number;
};

@Injectable()
export class SyncLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagination: PaginationService,
  ) {}

  createQueuedLog(params: {
    jobId: string;
    queueName: string;
    jobName: string;
    sourceType?: DataSource;
    metadataJson?: Prisma.InputJsonValue;
  }) {
    return this.prisma.syncLog.create({
      data: {
        jobId: params.jobId,
        queueName: params.queueName,
        jobName: params.jobName,
        status: SyncLogStatus.queued,
        sourceType: params.sourceType,
        metadataJson: params.metadataJson,
      },
    });
  }

  markRunning(jobId: string) {
    return this.prisma.syncLog.updateMany({
      where: { jobId },
      data: {
        status: SyncLogStatus.running,
        startedAt: new Date(),
      },
    });
  }

  markCompleted(jobId: string, counters: CounterUpdate = {}, metadataJson?: Prisma.InputJsonValue) {
    return this.finish(jobId, SyncLogStatus.completed, counters, metadataJson);
  }

  markPartial(jobId: string, counters: CounterUpdate = {}, metadataJson?: Prisma.InputJsonValue) {
    return this.finish(jobId, SyncLogStatus.partial, counters, metadataJson);
  }

  markFailed(jobId: string, errorMessage: string, counters: CounterUpdate = {}, metadataJson?: Prisma.InputJsonValue) {
    return this.prisma.syncLog.updateMany({
      where: { jobId },
      data: {
        status: SyncLogStatus.failed,
        failedAt: new Date(),
        errorMessage,
        ...counters,
        metadataJson,
      },
    });
  }

  async list(query: SyncLogsQueryDto) {
    const page = this.pagination.clampPage(query.page ?? 1);
    const pageSize = this.pagination.clampPerPage(query.pageSize ?? 20, 100);
    const skip = this.pagination.getSkip(page, pageSize);
    const where: Prisma.SyncLogWhereInput = {};

    if (query.queueName) {
      where.queueName = query.queueName;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [rows, totalRecords] = await Promise.all([
      this.prisma.syncLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.syncLog.count({ where }),
    ]);

    return {
      data: rows,
      meta: {
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize) || 1,
        currentPage: page,
        pageSize,
      },
    };
  }

  private finish(
    jobId: string,
    status: SyncLogStatus,
    counters: CounterUpdate,
    metadataJson?: Prisma.InputJsonValue,
  ) {
    return this.prisma.syncLog.updateMany({
      where: { jobId },
      data: {
        status,
        completedAt: new Date(),
        ...counters,
        metadataJson,
      },
    });
  }
}
