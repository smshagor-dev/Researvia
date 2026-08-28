import { connectDatabase } from "@/server/db/mongoose";
import { AcademicFeedSource } from "@/server/models/AcademicFeedSource";
import { EmailAccount } from "@/server/models/EmailAccount";
import { Job } from "@/server/models/Job";
import { PushSubscription } from "@/server/models/PushSubscription";
import { SystemMailAutoReply } from "@/server/models/SystemMailAutoReply";
import { SystemMailMessage } from "@/server/models/SystemMailMessage";
import { SystemMailSettings } from "@/server/models/SystemMailSettings";
import { SystemMailbox } from "@/server/models/SystemMailbox";

export type OperationalStatus = "HEALTHY" | "DEGRADED" | "CRITICAL";
export type OperationalIncident = {
  category: "PROVIDER" | "FEED" | "MAIL" | "PUSH" | "QUEUE";
  severity: "WARNING" | "CRITICAL";
  title: string;
  detail: string;
  href: string;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function statusFromCounts(critical: number, degraded: number): OperationalStatus {
  if (critical > 0) return "CRITICAL";
  if (degraded > 0) return "DEGRADED";
  return "HEALTHY";
}

function iso(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

export async function getOperationalHealth() {
  await connectDatabase();
  const now = new Date();
  const staleFeedBefore = new Date(now.getTime() - 36 * HOUR);
  const staleProviderBefore = new Date(now.getTime() - 48 * HOUR);
  const staleProcessingBefore = new Date(now.getTime() - 15 * 60 * 1000);
  const oldReadyBefore = new Date(now.getTime() - HOUR);
  const recentBefore = new Date(now.getTime() - DAY);

  const [
    providerGroups,
    staleProviders,
    feedGroups,
    staleFeeds,
    mailboxes,
    mailSettings,
    recentMail,
    vacationGroups,
    pushGroups,
    unhealthyPush,
    queueGroups,
    staleProcessing,
    oldReady,
    oldestReady,
    recentFailedJobs,
    recentFeedErrors
  ] = await Promise.all([
    EmailAccount.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    EmailAccount.countDocuments({ status: "CONNECTED", lastSyncedAt: { $ne: null, $lt: staleProviderBefore } }),
    AcademicFeedSource.aggregate<{ _id: string; count: number }>([
      { $group: { _id: { $cond: [{ $ne: ["$lastError", null] }, "ERROR", { $cond: ["$active", "ACTIVE", "INACTIVE"] } }, count: { $sum: 1 } } },
      { $project: { _id: "$_id", count: 1 } }
    ]),
    AcademicFeedSource.countDocuments({ active: true, $or: [{ lastSyncedAt: null }, { lastSyncedAt: { $lt: staleFeedBefore } }] }),
    SystemMailbox.aggregate<{ _id: string; count: number; usedBytes: number; quotaBytes: number }>([
      { $group: { _id: "$status", count: { $sum: 1 }, usedBytes: { $sum: "$usedBytes" }, quotaBytes: { $sum: "$quotaBytes" } } }
    ]),
    SystemMailSettings.aggregate<{ _id: null; total: number; imapEnabled: number; imapErrors: number; configErrors: number; vacationEnabled: number }>([
      { $group: {
        _id: null,
        total: { $sum: 1 },
        imapEnabled: { $sum: { $cond: ["$imapSyncEnabled", 1, 0] } },
        imapErrors: { $sum: { $cond: [{ $eq: ["$imapSyncStatus", "ERROR"] }, 1, 0] } },
        configErrors: { $sum: { $cond: [{ $and: [{ $ne: ["$lastConfigError", null] }, { $ne: ["$lastConfigError", ""] }] }, 1, 0] } },
        vacationEnabled: { $sum: { $cond: ["$vacationEnabled", 1, 0] } }
      } }
    ]),
    SystemMailMessage.aggregate<{ _id: string; count: number }>([
      { $match: { $or: [{ receivedAt: { $gte: recentBefore } }, { sentAt: { $gte: recentBefore } }] } },
      { $group: { _id: "$direction", count: { $sum: 1 } } }
    ]),
    SystemMailAutoReply.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: recentBefore } } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    PushSubscription.aggregate<{ _id: string; count: number }>([
      { $group: { _id: { $cond: ["$enabled", "ENABLED", "DISABLED"] }, count: { $sum: 1 } } }
    ]),
    PushSubscription.countDocuments({ enabled: true, failureCount: { $gte: 3 }, lastFailureAt: { $gte: recentBefore } }),
    Job.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Job.countDocuments({ status: "PROCESSING", lockedAt: { $ne: null, $lt: staleProcessingBefore } }),
    Job.countDocuments({ status: { $in: ["PENDING", "RETRYING"] }, availableAt: { $lt: oldReadyBefore } }),
    Job.findOne({ status: { $in: ["PENDING", "RETRYING"] } }).sort({ availableAt: 1 }).select({ availableAt: 1 }).lean(),
    Job.find({ status: "FAILED" }).sort({ updatedAt: -1 }).limit(8).select({ type: 1, attempts: 1, maxAttempts: 1, lastError: 1, updatedAt: 1 }).lean(),
    AcademicFeedSource.find({ lastError: { $ne: null } }).sort({ updatedAt: -1 }).limit(8).select({ name: 1, entityType: 1, lastError: 1, lastSyncedAt: 1, updatedAt: 1 }).lean()
  ]);

  const map = (rows: Array<{ _id: string; count: number }>) => Object.fromEntries(rows.map((row) => [String(row._id), Number(row.count)])) as Record<string, number>;
  const providerCounts = map(providerGroups);
  const feedCounts = map(feedGroups);
  const recentMailCounts = map(recentMail);
  const vacationCounts = map(vacationGroups);
  const pushCounts = map(pushGroups);
  const queueCounts = map(queueGroups);
  const mailboxCounts = Object.fromEntries(mailboxes.map((row) => [String(row._id), Number(row.count)])) as Record<string, number>;
  const mailboxUsedBytes = mailboxes.reduce((sum, row) => sum + Number(row.usedBytes ?? 0), 0);
  const mailboxQuotaBytes = mailboxes.reduce((sum, row) => sum + Number(row.quotaBytes ?? 0), 0);
  const mailConfig = mailSettings[0] ?? { _id: null, total: 0, imapEnabled: 0, imapErrors: 0, configErrors: 0, vacationEnabled: 0 };

  const providerReauth = providerCounts.REAUTH_REQUIRED ?? 0;
  const providerDisconnected = providerCounts.DISCONNECTED ?? 0;
  const feedErrors = feedCounts.ERROR ?? 0;
  const queueFailed = queueCounts.FAILED ?? 0;
  const vacationFailed = vacationCounts.FAILED ?? 0;

  const providers = {
    status: statusFromCounts(providerReauth, providerDisconnected + staleProviders),
    total: Object.values(providerCounts).reduce((sum, value) => sum + value, 0),
    connected: providerCounts.CONNECTED ?? 0,
    reauthRequired: providerReauth,
    disconnected: providerDisconnected,
    staleSync: staleProviders
  };
  const feeds = {
    status: statusFromCounts(feedErrors, staleFeeds),
    total: Object.values(feedCounts).reduce((sum, value) => sum + value, 0),
    active: feedCounts.ACTIVE ?? 0,
    inactive: feedCounts.INACTIVE ?? 0,
    errors: feedErrors,
    staleOrNeverSynced: staleFeeds
  };
  const mail = {
    status: statusFromCounts(Number(mailConfig.imapErrors) + vacationFailed, Number(mailConfig.configErrors) + (mailboxCounts.SUSPENDED ?? 0)),
    mailboxes: Object.values(mailboxCounts).reduce((sum, value) => sum + value, 0),
    activeMailboxes: mailboxCounts.ACTIVE ?? 0,
    suspendedMailboxes: mailboxCounts.SUSPENDED ?? 0,
    closedMailboxes: mailboxCounts.CLOSED ?? 0,
    imapEnabled: Number(mailConfig.imapEnabled),
    imapErrors: Number(mailConfig.imapErrors),
    configErrors: Number(mailConfig.configErrors),
    vacationEnabled: Number(mailConfig.vacationEnabled),
    vacationFailed24h: vacationFailed,
    inbound24h: recentMailCounts.INBOUND ?? 0,
    outbound24h: recentMailCounts.OUTBOUND ?? 0,
    usedBytes: mailboxUsedBytes,
    quotaBytes: mailboxQuotaBytes
  };
  const push = {
    status: statusFromCounts(0, unhealthyPush),
    subscriptions: Object.values(pushCounts).reduce((sum, value) => sum + value, 0),
    enabled: pushCounts.ENABLED ?? 0,
    disabled: pushCounts.DISABLED ?? 0,
    unhealthy: unhealthyPush
  };
  const queue = {
    status: statusFromCounts(staleProcessing, queueFailed + oldReady),
    pending: queueCounts.PENDING ?? 0,
    processing: queueCounts.PROCESSING ?? 0,
    retrying: queueCounts.RETRYING ?? 0,
    failed: queueFailed,
    completed: queueCounts.COMPLETED ?? 0,
    cancelled: queueCounts.CANCELLED ?? 0,
    staleProcessing,
    overdueReady: oldReady,
    oldestReadyAt: oldestReady?.availableAt ? iso(oldestReady.availableAt) : null
  };

  const incidents: OperationalIncident[] = [];
  if (providerReauth) incidents.push({ category: "PROVIDER", severity: "CRITICAL", title: "Email accounts require reauthorization", detail: `${providerReauth} connected account(s) cannot synchronize until the user reconnects.`, href: "/admin/operations#providers" });
  if (staleProviders) incidents.push({ category: "PROVIDER", severity: "WARNING", title: "Connected email synchronization is stale", detail: `${staleProviders} account(s) have not synchronized for more than 48 hours.`, href: "/admin/operations#providers" });
  if (feedErrors) incidents.push({ category: "FEED", severity: "CRITICAL", title: "Academic feed synchronization errors", detail: `${feedErrors} feed source(s) currently report an error.`, href: "/admin/data-sources" });
  if (staleFeeds) incidents.push({ category: "FEED", severity: "WARNING", title: "Academic feeds are stale or unsynchronized", detail: `${staleFeeds} active source(s) have never synced or are older than 36 hours.`, href: "/admin/data-sources" });
  if (Number(mailConfig.imapErrors)) incidents.push({ category: "MAIL", severity: "CRITICAL", title: "IMAP synchronization errors", detail: `${Number(mailConfig.imapErrors)} mailbox configuration(s) are in the ERROR state.`, href: "/admin/operations#mail" });
  if (Number(mailConfig.configErrors)) incidents.push({ category: "MAIL", severity: "WARNING", title: "Mailbox configuration errors", detail: `${Number(mailConfig.configErrors)} user mailbox setting(s) retain a provider/configuration error.`, href: "/admin/operations#mail" });
  if (vacationFailed) incidents.push({ category: "MAIL", severity: "CRITICAL", title: "Vacation replies failed recently", detail: `${vacationFailed} automatic reply job(s) failed in the last 24 hours.`, href: "/admin/jobs" });
  if (unhealthyPush) incidents.push({ category: "PUSH", severity: "WARNING", title: "Push subscriptions are failing", detail: `${unhealthyPush} enabled subscription(s) have at least three recent delivery failures.`, href: "/admin/operations#push" });
  if (staleProcessing) incidents.push({ category: "QUEUE", severity: "CRITICAL", title: "Background workers may be stalled", detail: `${staleProcessing} processing job(s) have held a lock for more than 15 minutes.`, href: "/admin/jobs" });
  if (queueFailed) incidents.push({ category: "QUEUE", severity: "WARNING", title: "Failed background jobs need attention", detail: `${queueFailed} job(s) are in the failed queue and can be inspected/replayed.`, href: "/admin/jobs" });
  if (oldReady) incidents.push({ category: "QUEUE", severity: "WARNING", title: "Runnable job backlog is aging", detail: `${oldReady} pending/retrying job(s) have been runnable for more than one hour.`, href: "/admin/jobs" });

  const statuses = [providers.status, feeds.status, mail.status, push.status, queue.status];
  const overall: OperationalStatus = statuses.includes("CRITICAL") ? "CRITICAL" : statuses.includes("DEGRADED") ? "DEGRADED" : "HEALTHY";

  return {
    generatedAt: now.toISOString(),
    overall,
    providers,
    feeds,
    mail,
    push,
    queue,
    incidents,
    recentFailedJobs: recentFailedJobs.map((job) => ({
      id: String(job._id),
      type: String(job.type),
      attempts: Number(job.attempts ?? 0),
      maxAttempts: Number(job.maxAttempts ?? 0),
      error: String(job.lastError ?? ""),
      updatedAt: iso(job.updatedAt)
    })),
    recentFeedErrors: recentFeedErrors.map((feed) => ({
      id: String(feed._id),
      name: String(feed.name),
      entityType: String(feed.entityType),
      error: String(feed.lastError ?? ""),
      lastSyncedAt: iso(feed.lastSyncedAt),
      updatedAt: iso(feed.updatedAt)
    }))
  };
}
