import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { EmailAccountsService } from '../email-accounts/email-accounts.service';
import { EmailRealtimeGateway } from '../email-realtime/email-realtime.gateway';

const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');

@Injectable()
export class InboxSyncService {
  private readonly logger = new Logger(InboxSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailAccounts: EmailAccountsService,
    private readonly realtime: EmailRealtimeGateway,
  ) {}

  async syncAccount(accountType: string, accountId: string, userId: string) {
    this.logger.log(`Syncing ${accountType} account ${accountId} for user ${userId}`);
    if (accountType === 'system' || accountType === 'custom') return this.syncImapEmailAccount(accountId, userId);
    if (accountType === 'gmail') return this.syncGmail(accountId, userId);
    if (accountType === 'outlook') return this.syncOutlook(accountId, userId);
    return { synced: 0 };
  }

  private async syncImapEmailAccount(accountId: string, userId: string) {
    const log = await this.prisma.mailboxSyncLog.create({
      data: { emailAccountId: accountId, status: 'running' },
    });

    try {
      const account = await this.emailAccounts.getDecryptedEmailAccount(accountId);
      if (!account.imapHost || !account.imapPort) return { synced: 0 };

      const connection = await imaps.connect({
        imap: {
          user: account.imapUsername,
          password: account.imapPassword,
          host: account.imapHost,
          port: account.imapPort,
          tls: account.imapSecure,
          authTimeout: 10000,
        },
      });

      await connection.openBox('INBOX');
      const since = account.lastSyncAt || new Date(Date.now() - 7 * 86400000);
      const searchCriteria = [['SINCE', since.toUTCString()]];
      const fetchOptions = { bodies: [''], markSeen: false };
      const messages = await connection.search(searchCriteria, fetchOptions);
      let synced = 0;

      for (const item of messages.slice(0, 50)) {
        const raw = item.parts?.find((part: any) => part.which === '')?.body;
        if (!raw) continue;
        const parsed = await simpleParser(raw);
        const providerMessageId = parsed.messageId;
        if (!providerMessageId) continue;

        const existing = await this.prisma.emailMessage.findFirst({ where: { messageIdHeader: providerMessageId } });
        if (existing) continue;

        const replyReference = parsed.inReplyTo || parsed.references?.[parsed.references.length - 1];
        if (!replyReference) continue;

        const originalMsg = await this.prisma.emailMessage.findFirst({ where: { messageIdHeader: replyReference } });
        if (!originalMsg) continue;

        const inbound = await this.prisma.$transaction(async (tx) => {
          const created = await tx.emailMessage.create({
            data: {
              threadId: originalMsg.threadId,
              userId,
              direction: 'inbound',
              fromEmail: parsed.from?.value?.[0]?.address || '',
              fromName: parsed.from?.value?.[0]?.name,
              toEmails: (parsed.to?.value || []).map((entry: any) => entry.address),
              subject: parsed.subject,
              bodyHtml: parsed.html || null,
              bodyText: parsed.text || '',
              messageIdHeader: providerMessageId,
              inReplyTo: replyReference,
              status: 'delivered',
            },
          });
          await tx.emailThread.update({
            where: { id: originalMsg.threadId },
            data: { status: 'replied', lastMessageAt: new Date(), unreadCount: { increment: 1 }, messageCount: { increment: 1 } },
          });
          await tx.emailMessage.update({
            where: { id: originalMsg.id },
            data: { repliedAt: new Date(), status: 'replied' },
          });
          return created;
        });

        this.realtime.emitMessageReceived(userId, inbound);
        this.realtime.emitThreadUpdated(userId, { threadId: originalMsg.threadId, status: 'replied' });
        synced++;
      }

      await connection.end();
      await this.prisma.emailAccount.update({ where: { id: accountId }, data: { lastSyncAt: new Date() } });
      await this.prisma.mailboxSyncLog.update({
        where: { id: log.id },
        data: { status: 'success', fetchedCount: messages.length, newCount: synced, finishedAt: new Date() },
      });
      return { synced };
    } catch (err: any) {
      this.logger.error(`IMAP sync error for ${accountId}: ${err.message}`);
      await this.prisma.mailboxSyncLog.update({
        where: { id: log.id },
        data: { status: 'failed', errorMessage: err.message, finishedAt: new Date() },
      });
      return { synced: 0, error: err.message };
    }
  }

  private async syncGmail(accountId: string, userId: string) {
    try {
      const { google } = await import('googleapis');
      const account = await this.emailAccounts.getDecryptedOAuth(accountId);
      if (!account.accessToken) return { synced: 0 };

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: account.accessToken, refresh_token: account.refreshToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const since = account.lastSyncedAt
        ? Math.floor(account.lastSyncedAt.getTime() / 1000)
        : Math.floor((Date.now() - 7 * 86400000) / 1000);

      const response = await gmail.users.messages.list({
        userId: 'me', q: `after:${since} in:inbox`,
      });

      const messages = response.data.messages || [];
      let synced = 0;

      for (const msgRef of messages.slice(0, 20)) {
        const msg = await gmail.users.messages.get({ userId: 'me', id: msgRef.id!, format: 'full' });
        const headers = msg.data.payload?.headers || [];
        const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;

        const inReplyTo = getHeader('in-reply-to');
        const from = getHeader('from') || '';
        const subject = getHeader('subject') || '';

        if (!inReplyTo) continue;

        const originalMsg = await this.prisma.emailMessage.findFirst({ where: { messageIdHeader: inReplyTo } });
        if (!originalMsg) continue;

        const existing = await this.prisma.emailMessage.findFirst({ where: { gmailMessageId: msgRef.id } });
        if (existing) continue;

        await this.prisma.$transaction([
          this.prisma.emailMessage.create({
            data: {
              threadId: originalMsg.threadId, userId,
              direction: 'inbound', fromEmail: from,
              toEmails: [], subject,
              bodyText: this.extractGmailBody(msg.data.payload),
              inReplyTo, gmailMessageId: msgRef.id,
              status: 'delivered',
            },
          }),
          this.prisma.emailThread.update({
            where: { id: originalMsg.threadId },
            data: { status: 'replied', lastMessageAt: new Date(), unreadCount: { increment: 1 }, messageCount: { increment: 1 } },
          }),
          this.prisma.emailMessage.update({
            where: { id: originalMsg.id },
            data: { repliedAt: new Date(), status: 'replied' },
          }),
        ]);
        synced++;
      }

      await this.prisma.oauthAccount.update({ where: { id: accountId }, data: { lastSyncedAt: new Date() } });
      return { synced };
    } catch (err: any) {
      this.logger.error(`Gmail sync error: ${err.message}`);
      return { synced: 0, error: err.message };
    }
  }

  private async syncOutlook(accountId: string, userId: string) {
    try {
      const account = await this.emailAccounts.getDecryptedOAuth(accountId);
      if (!account.accessToken) return { synced: 0 };

      const since = account.lastSyncedAt?.toISOString() || new Date(Date.now() - 7 * 86400000).toISOString();
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$filter=receivedDateTime ge ${since}&$orderby=receivedDateTime desc&$top=20`,
        { headers: { Authorization: `Bearer ${account.accessToken}` } }
      );
      if (!response.ok) return { synced: 0 };

      const data: any = await response.json();
      let synced = 0;

      for (const msg of (data.value || [])) {
        const inReplyTo = msg.internetMessageId;
        if (!inReplyTo) continue;
        const originalMsg = await this.prisma.emailMessage.findFirst({ where: { messageIdHeader: msg.conversationId } });
        if (!originalMsg) continue;

        const existing = await this.prisma.emailMessage.findFirst({ where: { outlookMessageId: msg.id } });
        if (existing) continue;

        await this.prisma.emailMessage.create({
          data: {
            threadId: originalMsg.threadId, userId,
            direction: 'inbound', fromEmail: msg.from?.emailAddress?.address || '',
            toEmails: [], subject: msg.subject,
            bodyText: msg.bodyPreview, bodyHtml: msg.body?.content,
            outlookMessageId: msg.id, status: 'delivered',
          },
        });
        synced++;
      }

      await this.prisma.oauthAccount.update({ where: { id: accountId }, data: { lastSyncedAt: new Date() } });
      return { synced };
    } catch (err: any) {
      this.logger.error(`Outlook sync error: ${err.message}`);
      return { synced: 0, error: err.message };
    }
  }

  private extractGmailBody(payload: any): string {
    if (!payload) return '';
    if (payload.body?.data) return Buffer.from(payload.body.data, 'base64url').toString('utf8');
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64url').toString('utf8');
        }
      }
    }
    return '';
  }
}
