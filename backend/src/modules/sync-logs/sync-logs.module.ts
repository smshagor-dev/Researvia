import { Module } from '@nestjs/common';
import { SyncLogsService } from './sync-logs.service';
import { PaginationService } from '../../shared/pagination/pagination.service';

@Module({
  providers: [SyncLogsService, PaginationService],
  exports: [SyncLogsService],
})
export class SyncLogsModule {}

