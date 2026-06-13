import { Module } from '@nestjs/common';
import { EmailQueueService } from './email-queue.service';
import { EmailAccountsModule } from '../modules/email-accounts/email-accounts.module';

@Module({
  imports: [EmailAccountsModule],
  providers: [EmailQueueService],
  exports: [EmailQueueService],
})
export class QueuesModule {}
