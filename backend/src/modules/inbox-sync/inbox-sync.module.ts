import { Module } from '@nestjs/common';
import { InboxSyncService } from './inbox-sync.service';
import { EmailAccountsModule } from '../email-accounts/email-accounts.module';
import { EmailRealtimeModule } from '../email-realtime/email-realtime.module';
@Module({ imports: [EmailAccountsModule, EmailRealtimeModule], providers: [InboxSyncService], exports: [InboxSyncService] })
export class InboxSyncModule {}
