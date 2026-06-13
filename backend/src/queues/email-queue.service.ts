import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, JobsOptions } from 'bullmq';
import { MailSettingsService } from '../modules/email-accounts/mail-settings.service';

export const EMAIL_SEND_QUEUE = 'email-send';
export const MAILBOX_SYNC_QUEUE = 'mailbox-sync';

@Injectable()
export class EmailQueueService implements OnModuleDestroy {
  private sendQueue?: Queue;
  private syncQueue?: Queue;
  private enabled = false;
  private initialized?: Promise<void>;
  private readonly defaultJobOptions: JobsOptions = {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  };

  constructor(
    private readonly config: ConfigService,
    private readonly mailSettings: MailSettingsService,
  ) {
    this.initialized = this.initialize();
  }

  private async initialize() {
    const settings = await this.mailSettings.getSettings();
    this.enabled = settings.emailQueuesEnabled;
    if (!this.enabled) return;

    const connection = { url: this.config.get<string>('REDIS_URL', 'redis://localhost:6379') };
    this.sendQueue = new Queue(EMAIL_SEND_QUEUE, { connection, defaultJobOptions: this.defaultJobOptions });
    this.syncQueue = new Queue(MAILBOX_SYNC_QUEUE, { connection, defaultJobOptions: this.defaultJobOptions });
  }

  async enqueueSend(messageId: string) {
    await this.initialized;
    if (!this.enabled || !this.sendQueue) throw new Error('Email queues are disabled');
    return this.sendQueue.add('send-message', { messageId });
  }

  async enqueueMailboxSync(accountType: string, accountId: string, userId: string) {
    await this.initialized;
    if (!this.enabled || !this.syncQueue) throw new Error('Email queues are disabled');
    return this.syncQueue.add(
      'sync-mailbox',
      { accountType, accountId, userId },
      { jobId: `${accountType}:${accountId}` },
    );
  }

  async onModuleDestroy() {
    await Promise.all([this.sendQueue?.close(), this.syncQueue?.close()]);
  }
}
