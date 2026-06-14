import { Module } from '@nestjs/common';
import { BackupsService } from './backups.service';
import { BackupsController } from './backups.controller';
import { BackupsCronService } from './backups-cron.service';

@Module({
  providers: [BackupsService, BackupsCronService],
  controllers: [BackupsController],
  exports: [BackupsService],
})
export class BackupsModule {}
