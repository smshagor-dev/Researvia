import { Module } from '@nestjs/common';
import { ProfessorSyncService } from './professor-sync.service';
import { ProfessorSyncAdminService } from './professor-sync-admin.service';
import { DiscoveryModule } from '../discovery/discovery.module';
import { QueuesModule } from '../../queues/queues.module';
import { SyncLogsModule } from '../sync-logs/sync-logs.module';

@Module({
  imports: [DiscoveryModule, QueuesModule, SyncLogsModule],
  providers: [ProfessorSyncService, ProfessorSyncAdminService],
  exports: [ProfessorSyncService, ProfessorSyncAdminService],
})
export class ProfessorSyncModule {}

