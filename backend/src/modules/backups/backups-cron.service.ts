import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BackupType } from '@prisma/client';
import { BackupsService } from './backups.service';

@Injectable()
export class BackupsCronService {
  private readonly logger = new Logger(BackupsCronService.name);

  constructor(private readonly backups: BackupsService) {}

  @Cron(process.env.BACKUP_DATABASE_CRON || '0 1 * * *')
  async backupDatabase() {
    const job = await this.backups.run(BackupType.database);
    this.logger.log(`Database backup completed: ${job.id}`);
  }

  @Cron(process.env.BACKUP_STORAGE_CRON || '0 2 * * 0')
  async backupStorage() {
    const job = await this.backups.run(BackupType.storage);
    this.logger.log(`Storage backup completed: ${job.id}`);
  }

  @Cron(process.env.BACKUP_FULL_SNAPSHOT_CRON || '0 3 1 * *')
  async backupFullSnapshot() {
    const job = await this.backups.run(BackupType.full_snapshot);
    this.logger.log(`Full snapshot completed: ${job.id}`);
  }
}
