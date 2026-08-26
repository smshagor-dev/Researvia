import mongoose from "mongoose";
import { prepareSystemMailboxDatabase } from "@/server/db/system-mailbox-indexes";
import { saveSystemMailDraft, sendSystemMailMessage } from "@/server/email/system-mailbox.service";
import { AppError } from "@/server/errors/AppError";
import { cancelJob, enqueueJob } from "@/server/jobs/job.service";
import { SystemMailMessage } from "@/server/models/SystemMailMessage";

const MAX_SCHEDULE_DAYS = 365;
const MIN_LEAD_MS = 60_000;

type ScheduleInput = {
  to: string[];
  cc?: string[];
  subject?: string;
  text: string;
  replyToMessageId?: string | null;
  draftId?: string | null;
  scheduledAt: Date;
};

function serializeScheduled(row: Record<string, unknown>) {
  return {
    id: String(row._id),
    to: Array.isArray(row.to) ? row.to.map(String) : [],
    cc: Array.isArray(row.cc) ? row.cc.map(String) : [],
    subject: String(row.subject ?? ""),
    textBody: String(row.textBody ?? ""),
    scheduledAt: row.scheduledAt ? new Date(row.scheduledAt as Date).toISOString() : null,
    scheduleStatus: row.scheduleStatus ? String(row.scheduleStatus) : null,
    createdAt: row.createdAt ? new Date(row.createdAt as Date).toISOString() : null
  };
}

function assertScheduleTime(value: Date) {
  const time = value.getTime();
  if (!Number.isFinite(time)) throw new AppError("MAIL_SCHEDULE_INVALID", 400, "Choose a valid delivery time.");
  const now = Date.now();
  if (time < now + MIN_LEAD_MS) throw new AppError("MAIL_SCHEDULE_TOO_SOON", 400, "Scheduled delivery must be at least one minute in the future.");
  if (time > now + MAX_SCHEDULE_DAYS * 24 * 60 * 60 * 1000) throw new AppError("MAIL_SCHEDULE_TOO_FAR", 400, "Scheduled delivery can be at most one year in the future.");
}

async function cancelPreviousJob(userId: string, draftId: string | null | undefined) {
  if (!draftId || !mongoose.isValidObjectId(draftId)) return;
  const current = await SystemMailMessage.findOne({ _id: draftId, userId, folder: "DRAFTS" }).select({ scheduleJobId: 1 }).lean();
  if (!current?.scheduleJobId) return;
  try { await cancelJob(String(current.scheduleJobId)); } catch { /* already claimed/completed jobs are guarded by message state */ }
}

export async function scheduleSystemMail(userId: string, input: ScheduleInput) {
  await prepareSystemMailboxDatabase();
  assertScheduleTime(input.scheduledAt);
  await cancelPreviousJob(userId, input.draftId);

  const draft = await saveSystemMailDraft(userId, {
    id: input.draftId ?? undefined,
    to: input.to,
    cc: input.cc ?? [],
    subject: input.subject ?? "",
    text: input.text
  });
  const messageId = String(draft.id);
  const job = await enqueueJob({
    type: "SEND_SCHEDULED_SYSTEM_MAIL",
    payload: { userId, messageId, replyToMessageId: input.replyToMessageId ?? null },
    availableAt: input.scheduledAt,
    idempotencyKey: `scheduled-system-mail:${messageId}:${input.scheduledAt.toISOString()}`,
    maxAttempts: 5
  });
  const updated = await SystemMailMessage.findOneAndUpdate(
    { _id: messageId, userId, folder: "DRAFTS" },
    { $set: { scheduledAt: input.scheduledAt, scheduleStatus: "PENDING", scheduleJobId: job._id, scheduleCancelledAt: null } },
    { new: true, runValidators: true }
  ).lean();
  if (!updated) {
    try { await cancelJob(String(job._id)); } catch { /* best-effort cleanup */ }
    throw new AppError("MAIL_SCHEDULE_FAILED", 500, "Scheduled message could not be saved.");
  }
  return serializeScheduled(updated as unknown as Record<string, unknown>);
}

export async function listScheduledSystemMail(userId: string) {
  await prepareSystemMailboxDatabase();
  const rows = await SystemMailMessage.find({ userId, folder: "DRAFTS", scheduleStatus: { $in: ["PENDING", "SENDING"] } })
    .sort({ scheduledAt: 1 })
    .limit(100)
    .lean();
  return rows.map((row) => serializeScheduled(row as unknown as Record<string, unknown>));
}

export async function cancelScheduledSystemMail(userId: string, messageId: string) {
  if (!mongoose.isValidObjectId(messageId)) throw new AppError("MAIL_NOT_FOUND", 404, "Scheduled message not found.");
  await prepareSystemMailboxDatabase();
  const row = await SystemMailMessage.findOne({ _id: messageId, userId, folder: "DRAFTS", scheduleStatus: "PENDING" }).lean();
  if (!row) throw new AppError("MAIL_SCHEDULE_NOT_CANCELLABLE", 400, "Only pending scheduled messages can be cancelled.");
  if (row.scheduleJobId) {
    try { await cancelJob(String(row.scheduleJobId)); } catch { /* state update below prevents delivery if the job was already claimed */ }
  }
  const updated = await SystemMailMessage.findOneAndUpdate(
    { _id: messageId, userId, folder: "DRAFTS", scheduleStatus: "PENDING" },
    { $set: { scheduleStatus: null, scheduledAt: null, scheduleJobId: null, scheduleCancelledAt: new Date() } },
    { new: true, runValidators: true }
  ).lean();
  if (!updated) throw new AppError("MAIL_SCHEDULE_NOT_CANCELLABLE", 409, "The scheduled message is already being delivered.");
  return { id: messageId, cancelled: true };
}

export async function processScheduledSystemMail(userId: string, messageId: string, replyToMessageId?: string | null) {
  if (!mongoose.isValidObjectId(messageId)) throw new AppError("MAIL_NOT_FOUND", 404, "Scheduled message not found.");
  await prepareSystemMailboxDatabase();
  const row = await SystemMailMessage.findOneAndUpdate(
    { _id: messageId, userId, folder: "DRAFTS", scheduleStatus: "PENDING", scheduledAt: { $lte: new Date() } },
    { $set: { scheduleStatus: "SENDING" } },
    { new: true }
  );
  if (!row) return { skipped: true };
  try {
    const message = await sendSystemMailMessage(userId, {
      to: row.to.map(String),
      cc: row.cc.map(String),
      subject: row.subject,
      text: row.textBody,
      replyToMessageId: replyToMessageId ?? null,
      draftId: messageId
    });
    return { skipped: false, message };
  } catch (error) {
    await SystemMailMessage.updateOne({ _id: messageId, userId, folder: "DRAFTS", scheduleStatus: "SENDING" }, { $set: { scheduleStatus: "PENDING" } });
    throw error;
  }
}
