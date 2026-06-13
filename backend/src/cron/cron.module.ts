import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { ScholarshipsModule } from '../modules/scholarships/scholarships.module';
import { EmailMessagesModule } from '../modules/email-messages/email-messages.module';
import { InboxSyncModule } from '../modules/inbox-sync/inbox-sync.module';
@Module({
  imports: [ScholarshipsModule, EmailMessagesModule, InboxSyncModule],
  providers: [CronService],
})
export class CronModule {}
