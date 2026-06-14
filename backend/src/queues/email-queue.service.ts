import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, JobsOptions } from 'bullmq';
import { MailSettingsService } from '../modules/email-accounts/mail-settings.service';
import { getRedisConnectionOptions } from '../shared/redis/redis.config';

export const EMAIL_SEND_QUEUE = 'email-send';
export const EMAIL_FOLLOWUP_QUEUE = 'email-followup';
export const EMAIL_SYNC_QUEUE = 'email-sync';
export const EMAIL_TRACKING_QUEUE = 'email-tracking';
export const EMAIL_REPLY_SYNC_QUEUE = 'email-reply-sync';
export const MAILBOX_SYNC_QUEUE = EMAIL_SYNC_QUEUE;
export const OUTREACH_QUEUE_NAMES = [
  EMAIL_SEND_QUEUE,
  EMAIL_FOLLOWUP_QUEUE,
  EMAIL_SYNC_QUEUE,
  EMAIL_TRACKING_QUEUE,
  EMAIL_REPLY_SYNC_QUEUE,
] as const;

@Injectable()
export class EmailQueueService implements OnModuleDestroy {
  private sendQueue?: Queue;
  private syncQueue?: Queue;
  private followupQueue?: Queue;
  private trackingQueue?: Queue;
  private replySyncQueue?: Queue;
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

    const connection = {
      ...getRedisConnectionOptions(this.config),
      maxRetriesPerRequest: null,
    };
    this.sendQueue = new Queue(EMAIL_SEND_QUEUE, { connection, defaultJobOptions: this.defaultJobOptions });
    this.syncQueue = new Queue(MAILBOX_SYNC_QUEUE, { connection, defaultJobOptions: this.defaultJobOptions });
    this.followupQueue = new Queue(EMAIL_FOLLOWUP_QUEUE, { connection, defaultJobOptions: this.defaultJobOptions });
    this.trackingQueue = new Queue(EMAIL_TRACKING_QUEUE, { connection, defaultJobOptions: this.defaultJobOptions });
    this.replySyncQueue = new Queue(EMAIL_REPLY_SYNC_QUEUE, { connection, defaultJobOptions: this.defaultJobOptions });
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

  async enqueueFollowup(threadId: string, runAt: Date, stage: string) {
    await this.initialized;
    if (!this.enabled || !this.followupQueue) throw new Error('Email queues are disabled');
    return this.followupQueue.add(
      'send-followup',
      { threadId, stage },
      { jobId: `${threadId}:${stage}`, delay: Math.max(runAt.getTime() - Date.now(), 0) },
    );
  }

  async enqueueReplySync(accountId: string, userId: string) {
    await this.initialized;
    if (!this.enabled || !this.replySyncQueue) throw new Error('Email queues are disabled');
    return this.replySyncQueue.add('sync-replies', { accountId, userId }, { jobId: `reply:${accountId}` });
  }

  async enqueueTracking(messageId: string, eventType: string) {
    await this.initialized;
    if (!this.enabled || !this.trackingQueue) throw new Error('Email queues are disabled');
    return this.trackingQueue.add('track-email-event', { messageId, eventType });
  }

  async onModuleDestroy() {
    await Promise.all([
      this.sendQueue?.close(),
      this.syncQueue?.close(),
      this.followupQueue?.close(),
      this.trackingQueue?.close(),
      this.replySyncQueue?.close(),
    ]);
  }
}
