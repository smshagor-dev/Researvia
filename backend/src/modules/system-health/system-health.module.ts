import { Module } from '@nestjs/common';
import { SystemHealthController } from './system-health.controller';
import { SystemHealthService } from './system-health.service';
import { QueuesModule } from '../../queues/queues.module';
import { WorkerHeartbeatService } from './worker-heartbeat.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [QueuesModule, StorageModule],
  controllers: [SystemHealthController],
  providers: [SystemHealthService, WorkerHeartbeatService],
  exports: [SystemHealthService, WorkerHeartbeatService],
})
export class SystemHealthModule {}
