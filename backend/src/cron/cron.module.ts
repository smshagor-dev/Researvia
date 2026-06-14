import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { ProfessorSyncCronService } from './professor-sync-cron.service';
import { ScholarshipsModule } from '../modules/scholarships/scholarships.module';
import { EmailMessagesModule } from '../modules/email-messages/email-messages.module';
import { InboxSyncModule } from '../modules/inbox-sync/inbox-sync.module';
import { ProfessorSyncModule } from '../modules/professor-sync/professor-sync.module';
import { AiModule } from '../modules/ai/ai.module';
import { AiMatchCronService } from './ai-match-cron.service';
import { OpportunitiesModule } from '../modules/opportunities/opportunities.module';
import { OpportunityCronService } from '../modules/opportunities/opportunity-cron.service';
@Module({
  imports: [ScholarshipsModule, EmailMessagesModule, InboxSyncModule, ProfessorSyncModule, AiModule, OpportunitiesModule],
  providers: [CronService, ProfessorSyncCronService, AiMatchCronService, OpportunityCronService],
})
export class CronModule {}
