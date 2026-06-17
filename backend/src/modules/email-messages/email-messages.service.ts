import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { EmailAccountsService } from '../email-accounts/email-accounts.service';
import { ConfigService } from '@nestjs/config';
import { EmailQueueService } from '../../queues/email-queue.service';
import { MailSettingsService } from '../email-accounts/mail-settings.service';
import * as nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { UsageMeteringService } from '../billing/usage-metering.service';
import { AuditLogService } from '../security/audit-log.service';
import { emailSendCounter } from '../observability/metrics.registry';
import { SystemSettingsService } from '../system-settings/system-settings.service';

@Injectable()
export class EmailMessagesService {
  private readonly logger = new Logger(EmailMessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailAccounts: EmailAccountsService,
    private readonly config: ConfigService,
    private readonly emailQueue: EmailQueueService,
    private readonly mailSettings: MailSettingsService,
    private readonly usage: UsageMeteringService,
    private readonly audit: AuditLogService,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  async createMessage(threadId: string, userId: string, data: any) {
    const thread = await this.prisma.emailThread.findFirst({ where: { id: threadId, userId } });
    if (!thread) throw new NotFoundException('Thread not found');
    const unifiedAccount = ['system', 'custom'].includes(thread.accountType)
      ? await this.emailAccounts.getDecryptedEmailAccount(thread.accountId)
      : null;

    const messageId = `<${uuidv4()}@researvia.app>`;
    const message = await this.prisma.emailMessage.create({
      data: {
        threadId,
        userId,
        direction: 'outbound',
        fromEmail: data.fromEmail || unifiedAccount?.email || '',
        fromName: data.fromName,
        toEmails: data.toEmails,
        ccEmails: data.ccEmails,
        bccEmails: data.bccEmails,
        subject: data.subject || thread.subject,
        body: data.body || data.bodyText,
        bodyHtml: data.bodyHtml,
        bodyText: data.bodyText,
        provider: data.provider || unifiedAccount?.provider || thread.accountType,
        trackingToken: data.trackingToken || uuidv4(),
        messageIdHeader: messageId,
        inReplyTo: data.inReplyTo,
        status: data.scheduledAt ? 'scheduled' : 'queued',
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      },
    });

    if (!data.scheduledAt) {
      const settings = await this.mailSettings.getSettings();
      if (settings.emailQueuesEnabled && settings.emailSendAsync) {
        await this.emailQueue.enqueueSend(message.id);
      } else {
        await this.sendMessage(message.id, thread);
      }
    }

    return message;
  }

  async sendMessage(messageId: string, thread?: any) {
    const message = await this.prisma.emailMessage.findUnique({
      where: { id: messageId },
      include: { thread: true, attachments: true },
    });
    if (!message) throw new NotFoundException('Message not found');

    const t = thread || message.thread;

    try {
      await this.usage.assertWithinLimit(message.userId, 'email_send');
      await this.prisma.emailMessage.update({ where: { id: messageId }, data: { status: 'sending' } });

      if (t.accountType === 'system' || t.accountType === 'custom') {
        const sendAccount = await this.emailAccounts.getDefaultSendAccount(message.userId);

        try {
          await this.sendViaEmailAccount(message, sendAccount.id);
          t.accountId = sendAccount.id;
          t.accountType = sendAccount.type.toLowerCase();
        } catch (err: any) {
          const fallbackEnabled = await this.systemSettings.getBoolean(
            'email.allow_fallback',
            String(this.config.get('ALLOW_EMAIL_FALLBACK', 'false')).toLowerCase() === 'true',
          );
          const fallback = fallbackEnabled ? await this.getSystemFallbackAccount(message.userId) : null;

          if (!fallback || fallback.id === sendAccount.id) {
            throw err;
          }

          this.logger.warn(`Default account send failed for user ${message.userId}, falling back to system mailbox: ${err.message}`);
          await this.sendViaEmailAccount(message, fallback.id);
          t.accountId = fallback.id;
          t.accountType = fallback.type.toLowerCase();
        }
      } else if (t.accountType === 'smtp') {
        await this.sendViaSMTP(message, t.accountId);
      } else if (t.accountType === 'gmail') {
        await this.sendViaGmail(message, t.accountId);
      } else if (t.accountType === 'outlook') {
        await this.sendViaOutlook(message, t.accountId);
      }

      await this.prisma.$transaction([
        this.prisma.emailMessage.update({
          where: { id: messageId },
          data: { status: 'sent', sentAt: new Date() },
        }),
        this.prisma.emailThread.update({
          where: { id: t.id },
          data: {
            status: 'sent',
            currentStage: t.currentStage === 'saved' || t.currentStage === 'planned' ? 'contacted' : t.currentStage,
            lastMessageAt: new Date(),
            messageCount: { increment: 1 },
            sentCount: { increment: 1 },
          },
        }),
      ]);
      await this.usage.recordUsage(message.userId, 'email_send');
      emailSendCounter.inc({ status: 'sent' });
      await this.audit.logUserAction({
        userId: message.userId,
        action: 'email.send',
        entityType: 'email_message',
        entityId: messageId,
        metadata: { threadId: t.id, accountType: t.accountType },
      });
    } catch (err: any) {
      this.logger.error(`Failed to send message ${messageId}: ${err.message}`);
      emailSendCounter.inc({ status: 'failed' });
      await this.prisma.emailMessage.update({
        where: { id: messageId },
        data: { status: 'failed', errorMessage: err.message },
      });
      throw err;
    }
  }

  private async sendViaEmailAccount(message: any, accountId: string) {
    const account = await this.emailAccounts.getDecryptedEmailAccount(accountId);

    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpSecure,
      requireTLS: !account.smtpSecure,
      auth: { user: account.smtpUsername, pass: account.smtpPassword },
    });

    const trackingPixel = await this.buildTrackingPixel(message.id);
    const htmlBody = message.bodyHtml
      ? `${message.bodyHtml}${trackingPixel}`
      : `<p>${message.bodyText || ''}</p>${trackingPixel}`;

    await transporter.sendMail({
      from: `"${message.fromName || account.email}" <${account.email}>`,
      to: (message.toEmails as string[]).join(', '),
      cc: message.ccEmails ? (message.ccEmails as string[]).join(', ') : undefined,
      bcc: message.bccEmails ? (message.bccEmails as string[]).join(', ') : undefined,
      subject: message.subject,
      html: htmlBody,
      text: message.bodyText,
      messageId: message.messageIdHeader,
      inReplyTo: message.inReplyTo || undefined,
    });

    await this.prisma.emailTracking.create({
      data: { messageId: message.id, eventType: 'delivery', metadata: { provider: account.type } },
    });
  }

  private async getSystemFallbackAccount(userId: string) {
    return this.prisma.emailAccount.findFirst({
      where: { userId, type: 'SYSTEM', isActive: true, mailboxStatus: 'active' },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async sendViaSMTP(message: any, accountId: string) {
    const account = await this.emailAccounts.getDecryptedSmtp(accountId);

    const transporter = nodemailer.createTransport({
      host: account.host,
      port: account.port,
      secure: account.encryption === 'ssl',
      requireTLS: account.encryption === 'tls',
      auth: { user: account.username, pass: account.password },
    });

    const trackingPixel = await this.buildTrackingPixel(message.id);
    const htmlBody = message.bodyHtml
      ? `${message.bodyHtml}${trackingPixel}`
      : `<p>${message.bodyText}</p>${trackingPixel}`;

    await transporter.sendMail({
      from: `"${account.fromName || ''}" <${account.fromEmail}>`,
      to: (message.toEmails as string[]).join(', '),
      cc: message.ccEmails ? (message.ccEmails as string[]).join(', ') : undefined,
      subject: message.subject,
      html: htmlBody,
      text: message.bodyText,
      messageId: message.messageIdHeader,
      inReplyTo: message.inReplyTo || undefined,
    });
  }

  private async sendViaGmail(message: any, accountId: string) {
    const { google } = await import('googleapis');
    const account = await this.emailAccounts.getDecryptedOAuth(accountId);

    const oauth2Client = new google.auth.OAuth2(
      this.config.get('GOOGLE_CLIENT_ID'),
      this.config.get('GOOGLE_CLIENT_SECRET'),
    );
    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const trackingPixel = await this.buildTrackingPixel(message.id);
    const htmlBody = `${message.bodyHtml || `<p>${message.bodyText}</p>`}${trackingPixel}`;

    const rawMessage = this.buildRawEmail({
      from: account.email,
      to: (message.toEmails as string[]).join(', '),
      subject: message.subject,
      html: htmlBody,
      messageId: message.messageIdHeader,
      inReplyTo: message.inReplyTo,
    });

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: rawMessage },
    });
  }

  private async sendViaOutlook(message: any, accountId: string) {
    // Microsoft Graph API implementation
    const account = await this.emailAccounts.getDecryptedOAuth(accountId);
    const trackingPixel = await this.buildTrackingPixel(message.id);

    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject: message.subject,
          body: {
            contentType: 'HTML',
            content: `${message.bodyHtml || `<p>${message.bodyText}</p>`}${trackingPixel}`,
          },
          toRecipients: (message.toEmails as string[]).map((email: string) => ({
            emailAddress: { address: email },
          })),
        },
        saveToSentItems: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Outlook send failed: ${response.status}`);
    }
  }

  async trackOpen(messageId: string) {
    const message = await this.prisma.emailMessage.findUnique({ where: { id: messageId } });
    if (!message) return;

    await this.prisma.$transaction([
      this.prisma.emailMessage.update({
        where: { id: messageId },
        data: {
          openCount: { increment: 1 },
          firstOpenedAt: message.firstOpenedAt || new Date(),
          lastOpenedAt: new Date(),
          status: message.status === 'sent' || message.status === 'delivered' ? 'opened' : message.status,
        },
      }),
      this.prisma.emailTracking.create({
        data: { messageId, eventType: 'open' },
      }),
      this.prisma.emailThread.update({
        where: { id: message.threadId },
        data: { openCount: { increment: 1 } },
      }),
    ]);
  }

  async trackClick(messageId: string, url: string) {
    const message = await this.prisma.emailMessage.findUnique({ where: { id: messageId } });
    if (!message) return;
    await this.prisma.$transaction([
      this.prisma.emailMessage.update({
        where: { id: messageId },
        data: { status: message.status === 'sent' || message.status === 'opened' ? 'clicked' : message.status },
      }),
      this.prisma.emailTracking.create({
        data: { messageId, eventType: 'click', url },
      }),
    ]);
  }

  async updateDraft(messageId: string, userId: string, data: any) {
    const message = await this.prisma.emailMessage.findFirst({ where: { id: messageId, userId, status: 'draft' } });
    if (!message) throw new NotFoundException('Draft not found');
    return this.prisma.emailMessage.update({ where: { id: messageId }, data });
  }

  async deleteDraft(messageId: string, userId: string) {
    await this.prisma.emailMessage.deleteMany({ where: { id: messageId, userId, status: 'draft' } });
    return { success: true };
  }

  async processScheduled() {
    const messages = await this.prisma.emailMessage.findMany({
      where: { status: 'scheduled', scheduledAt: { lte: new Date() } },
      include: { thread: true },
      take: 50,
    });

    for (const message of messages) {
      try {
        await this.prisma.emailMessage.update({ where: { id: message.id }, data: { status: 'queued' } });
        const settings = await this.mailSettings.getSettings();
        if (settings.emailQueuesEnabled && settings.emailSendAsync) {
          await this.emailQueue.enqueueSend(message.id);
        } else {
          await this.sendMessage(message.id, message.thread);
        }
      } catch (e) {
        this.logger.error(`Scheduled send failed for ${message.id}`);
      }
    }
    return messages.length;
  }

  private async buildTrackingPixel(messageId: string): Promise<string> {
    const settings = await this.mailSettings.getSettings();
    return `<img src="${settings.trackingBaseUrl}/v1/track/open/${messageId}" width="1" height="1" style="display:none" alt="" />`;
  }

  private buildRawEmail(data: any): string {
    const lines = [
      `From: ${data.from}`,
      `To: ${data.to}`,
      `Subject: ${data.subject}`,
      `Message-ID: ${data.messageId}`,
      data.inReplyTo ? `In-Reply-To: ${data.inReplyTo}` : '',
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      data.html,
    ].filter(Boolean);

    return Buffer.from(lines.join('\r\n')).toString('base64url');
  }
}
