import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { QueuesModule } from '../../queues/queues.module';
import { EmailMessagesModule } from '../email-messages/email-messages.module';
import { EmailAccountsModule } from '../email-accounts/email-accounts.module';
import { OutreachController } from './outreach.controller';
import { AdminOutreachController } from './admin-outreach.controller';
import { OutreachService } from './outreach.service';
import { PaginationService } from '../../shared/pagination/pagination.service';

@Module({
  imports: [PrismaModule, QueuesModule, EmailMessagesModule, EmailAccountsModule],
  controllers: [OutreachController, AdminOutreachController],
  providers: [OutreachService, PaginationService],
  exports: [OutreachService],
})
export class OutreachModule {}
