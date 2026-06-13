import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScholarshipsService } from '../modules/scholarships/scholarships.service';
import { EmailMessagesService } from '../modules/email-messages/email-messages.service';
import { InboxSyncService } from '../modules/inbox-sync/inbox-sync.service';
import { PrismaService } from '../shared/prisma/prisma.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly scholarships: ScholarshipsService,
    private readonly emailMessages: EmailMessagesService,
    private readonly inboxSync: InboxSyncService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron('5 0 * * *') // Daily 00:05 UTC
  async markExpiredScholarships() {
    const count = await this.scholarships.markExpired();
    this.logger.log(`Marked ${count} scholarships as expired`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledEmails() {
    const count = await this.emailMessages.processScheduled();
    if (count > 0) this.logger.log(`Dispatched ${count} scheduled emails`);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncInboxes() {
    const accounts = await this.prisma.oauthAccount.findMany({
      where: { isInboxSyncEnabled: true },
      select: { id: true, userId: true, provider: true },
    });
    for (const acc of accounts) {
      try {
        const accountType = acc.provider === 'google' ? 'gmail' : 'outlook';
        await this.inboxSync.syncAccount(accountType, acc.id, acc.userId);
      } catch (e: any) {
        this.logger.warn(`Inbox sync failed for ${acc.id}: ${e.message}`);
      }
    }

    const imapAccounts = await this.prisma.emailAccount.findMany({
      where: { isActive: true, mailboxStatus: 'active', imapHost: { not: null }, imapPort: { not: null } },
      select: { id: true, userId: true, type: true },
    });

    for (const acc of imapAccounts) {
      try {
        await this.inboxSync.syncAccount(acc.type.toLowerCase(), acc.id, acc.userId);
      } catch (e: any) {
        this.logger.warn(`IMAP sync failed for ${acc.id}: ${e.message}`);
      }
    }
  }
}
