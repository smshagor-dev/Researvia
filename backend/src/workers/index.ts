import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import { AppModule } from '../app.module';
import { EMAIL_SEND_QUEUE, MAILBOX_SYNC_QUEUE } from '../queues/email-queue.service';
import { EmailMessagesService } from '../modules/email-messages/email-messages.service';
import { InboxSyncService } from '../modules/inbox-sync/inbox-sync.service';
import { MailSettingsService } from '../modules/email-accounts/mail-settings.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);
  const emailMessages = app.get(EmailMessagesService);
  const inboxSync = app.get(InboxSyncService);
  const mailSettings = app.get(MailSettingsService);
  const settings = await mailSettings.getSettings();
  const connection = { url: config.get<string>('REDIS_URL', 'redis://localhost:6379') };

  const sendWorker = new Worker(
    EMAIL_SEND_QUEUE,
    async (job) => {
      await emailMessages.sendMessage(job.data.messageId);
    },
    { connection, concurrency: settings.emailSendConcurrency },
  );

  const syncWorker = new Worker(
    MAILBOX_SYNC_QUEUE,
    async (job) => {
      await inboxSync.syncAccount(job.data.accountType, job.data.accountId, job.data.userId);
    },
    { connection, concurrency: settings.mailboxSyncConcurrency },
  );

  const shutdown = async () => {
    await Promise.all([sendWorker.close(), syncWorker.close()]);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap();
