import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { prepareSystemMailboxDatabase } from "@/server/db/system-mailbox-indexes";
import { AppError } from "@/server/errors/AppError";
import { cancelJob, enqueueJob } from "@/server/jobs/job.service";
import { SystemMailMessage } from "@/server/models/SystemMailMessage";
import { ensureSystemMailbox, sendSystemMailMessage } from "@/server/email/system-mailbox.service";

const ADDRESS_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;
const MAX_RECIPIENTS = 20;
const MAX_BODY_CHARS = 200_000;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const MIN_SCHEDULE_DELAY_MS = 30_000;
const MAX_SCHEDULE_AHEAD_MS = 366 * 24 * 60 * 60 * 1000;

function normalizeAddress(value: string) {
  const angle = value.match(/<([^<>\s]+@[^<>\s]+)>/);
  const plain = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return (angle?.[1] ?? plain?.[0] ?? value).trim().toLowerCase();
}

function normalizeAddressList(values: string[]) {
  return [...new Set(values.map(normalizeAddress).filter((value) => ADDRESS_RE.test(value)))];
}

function safeFileName(value: string) {
  return value.replace(/[\\/\0\r\n]+/g, "_").slice(0, 255) || "attachment";
}

function safeSubject(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 500);
}

function validateScheduleDate(value: Date) {
  if (Number.isNaN(value.getTime())) throw new AppError("MAIL_SCHEDULE_INVALID", 400, "Choose a valid delivery time.");
  const delta = value.getTime() - Date.now();
  if (delta < MIN_SCHEDULE_DELAY_MS) throw new AppError("MAIL_SCHEDULE_TOO_SOON", 400, "Scheduled delivery must be at least 30 seconds in the future.");
  if (delta > MAX_SCHEDULE_AHEAD_MS) throw new AppError("MAIL_SCHEDULE_TOO_FAR", 400, "Scheduled delivery cannot be more than one year in the future.");
}

async function attachmentBucket() {
  const connection = await prepareSystemMailboxDatabase().then(() => mongoose.connection);
  if (!connection.db) throw new AppError("DATABASE_UNAVAILABLE", 503, "Mailbox attachment storage is unavailable.");
  return new mongoose.mongo.GridFSBucket(connection.db, { bucketName: "systemMailAttachments" });
}

async function persistFiles(userId: string, files: File[]) {
  if (files.length > 10) throw new AppError("MAIL_ATTACHMENT_LIMIT", 400, "A message can include at most 10 attachments.");
  const bucket = await attachmentBucket();
  const saved: Array<{ fileId: mongoose.Types.ObjectId; filename: string; contentType: string; size: number }> = [];
  try {
    for (const file of files) {
      if (file.size < 1 || file.size > MAX_ATTACHMENT_BYTES) {
        throw new AppError("MAIL_ATTACHMENT_SIZE", 400, "Each scheduled-mail attachment must be 25 MB or smaller.");
      }
      const filename = safeFileName(file.name);
      const contentType = file.type || "application/octet-stream";
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = bucket.openUploadStream(filename, { metadata: { userId, contentType } });
      await new Promise<void>((resolve, reject) => stream.end(buffer, (error?: Error | null) => error ? reject(error) : resolve()));
      saved.push({ fileId: stream.id, filename, contentType, size: file.size });
    }
    return saved;
  } catch (error) {
    await Promise.all(saved.map((item) => bucket.delete(item.fileId).catch(() => undefined)));
    throw error;
  }
}

async function deletePersistedFiles(fileIds: mongoose.Types.ObjectId[]) {
  if (fileIds.length === 0) return;
  const bucket = await attachmentBucket();
  await Promise.all(fileIds.map((fileId) => bucket.delete(fileId).catch(() => undefined)));
}

async function readPersistedFiles(items: Array<{ fileId: mongoose.Types.ObjectId; filename: string; contentType: string }>) {
  if (items.length === 0) return [];
  const bucket = await attachmentBucket();
  return Promise.all(items.map(async (item) => {
    const chunks: Buffer[] = [];
    const stream = bucket.openDownloadStream(item.fileId);
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      stream.on("error", reject);
      stream.on("end", resolve);
    });
    const buffer = Buffer.concat(chunks);
    return new File([new Uint8Array(buffer)], item.filename, { type: item.contentType });
  }));
}

function serializeScheduledMessage(message: Record<string, unknown>) {
  const job = message.scheduleJobId && typeof message.scheduleJobId === "object"
    ? message.scheduleJobId as Record<string, unknown>
    : null;
  const scheduleStatus = String(message.scheduleStatus ?? "PENDING");
  const jobStatus = job?.status ? String(job.status) : null;
  return {
    id: String(message._id),
    to: Array.isArray(message.to) ? message.to.map(String) : [],
    cc: Array.isArray(message.cc) ? message.cc.map(String) : [],
    subject: String(message.subject ?? ""),
    text: String(message.textBody ?? ""),
    scheduledAt: message.scheduledAt ? new Date(message.scheduledAt as Date).toISOString() : null,
    status: jobStatus === "FAILED" ? "FAILED" : scheduleStatus,
    attempts: Number(job?.attempts ?? 0),
    maxAttempts: Number(job?.maxAttempts ?? 0),
    lastError: job?.lastError ? String(job.lastError) : null,
    attachments: Array.isArray(message.attachments)
      ? message.attachments.map((entry) => {
          const row = entry as Record<string, unknown>;
          return { filename: String(row.filename), contentType: String(row.contentType), size: Number(row.size ?? 0) };
        })
      : [],
    createdAt: message.createdAt ? new Date(message.createdAt as Date).toISOString() : null
  };
}

export async function listScheduledSystemMail(userId: string) {
  await prepareSystemMailboxDatabase();
  const messages = await SystemMailMessage.find({ userId, scheduledAt: { $ne: null }, scheduleStatus: { $ne: null } })
    .populate("scheduleJobId", "status attempts maxAttempts lastError availableAt")
    .sort({ scheduledAt: 1, createdAt: -1 })
    .limit(200)
    .lean();
  return messages.map((message) => serializeScheduledMessage(message as unknown as Record<string, unknown>));
}

export async function scheduleSystemMail(
  userId: string,
  input: { to: string[]; cc?: string[]; subject?: string; text: string; scheduledAt: Date },
  files: File[] = []
) {
  const mailbox = await ensureSystemMailbox(userId);
  if (mailbox.status !== "ACTIVE") throw new AppError("MAILBOX_UNAVAILABLE", 403, "This system mailbox is not active.");
  validateScheduleDate(input.scheduledAt);

  const to = normalizeAddressList(input.to);
  const cc = normalizeAddressList(input.cc ?? []);
  if (to.length === 0) throw new AppError("MAIL_RECIPIENT_REQUIRED", 400, "Add at least one valid recipient.");
  if (to.length + cc.length > MAX_RECIPIENTS) throw new AppError("MAIL_RECIPIENT_LIMIT", 400, `A message can have at most ${MAX_RECIPIENTS} recipients.`);
  const text = input.text.trim().slice(0, MAX_BODY_CHARS);
  if (!text) throw new AppError("MAIL_BODY_REQUIRED", 400, "Message body is required.");

  const attachments = await persistFiles(userId, files);
  const scheduleToken = randomUUID();
  let message: Awaited<ReturnType<typeof SystemMailMessage.create>> | null = null;
  try {
    message = await SystemMailMessage.create({
      userId,
      mailboxId: mailbox._id,
      internetMessageId: `scheduled-${scheduleToken}@${String(mailbox.address).split("@").at(-1)}`,
      threadKey: `scheduled-${scheduleToken}`,
      direction: "DRAFT",
      folder: "DRAFTS",
      from: mailbox.address,
      to,
      cc,
      subject: safeSubject(input.subject ?? ""),
      textBody: text,
      snippet: text.slice(0, 500),
      attachments,
      scheduledAt: input.scheduledAt,
      scheduleStatus: "PENDING",
      readAt: new Date()
    });

    const job = await enqueueJob({
      type: "SEND_SCHEDULED_SYSTEM_MAIL",
      payload: { messageId: String(message._id), userId },
      availableAt: input.scheduledAt,
      maxAttempts: 5,
      idempotencyKey: `scheduled-system-mail:${String(message._id)}`
    });
    message.scheduleJobId = job._id;
    await message.save();
    const populated = await SystemMailMessage.findById(message._id)
      .populate("scheduleJobId", "status attempts maxAttempts lastError availableAt")
      .lean();
    return serializeScheduledMessage(populated as unknown as Record<string, unknown>);
  } catch (error) {
    if (message?._id) await SystemMailMessage.deleteOne({ _id: message._id }).catch(() => undefined);
    await deletePersistedFiles(attachments.map((item) => item.fileId));
    throw error;
  }
}

export async function cancelScheduledSystemMail(userId: string, messageId: string) {
  if (!mongoose.isValidObjectId(messageId)) throw new AppError("MAIL_SCHEDULE_NOT_FOUND", 404, "Scheduled message not found.");
  await prepareSystemMailboxDatabase();
  const message = await SystemMailMessage.findOne({ _id: messageId, userId, scheduleStatus: "PENDING" });
  if (!message) throw new AppError("MAIL_SCHEDULE_NOT_CANCELLABLE", 409, "Only a pending scheduled message can be cancelled.");

  if (message.scheduleJobId) await cancelJob(String(message.scheduleJobId));
  const fileIds = message.attachments.map((item) => item.fileId as mongoose.Types.ObjectId);
  message.scheduleStatus = "CANCELLED";
  message.scheduleCancelledAt = new Date();
  message.attachments = [];
  await message.save();
  await deletePersistedFiles(fileIds);
  return serializeScheduledMessage(message.toObject() as unknown as Record<string, unknown>);
}

export async function processScheduledSystemMail(messageId: string) {
  if (!mongoose.isValidObjectId(messageId)) throw new Error("Invalid scheduled message id.");
  await prepareSystemMailboxDatabase();
  const message = await SystemMailMessage.findOneAndUpdate(
    { _id: messageId, scheduleStatus: "PENDING" },
    { $set: { scheduleStatus: "SENDING" } },
    { new: true }
  );
  if (!message) {
    const existing = await SystemMailMessage.findById(messageId).select("scheduleStatus").lean();
    if (!existing || existing.scheduleStatus === "CANCELLED") return;
    throw new Error("Scheduled message is already being processed.");
  }

  const storedAttachments = message.attachments.map((item) => ({
    fileId: item.fileId as mongoose.Types.ObjectId,
    filename: String(item.filename),
    contentType: String(item.contentType)
  }));
  try {
    const files = await readPersistedFiles(storedAttachments);
    await sendSystemMailMessage(String(message.userId), {
      to: message.to.map(String),
      cc: message.cc.map(String),
      subject: message.subject,
      text: message.textBody
    }, files);
    await SystemMailMessage.deleteOne({ _id: message._id, scheduleStatus: "SENDING" });
    await deletePersistedFiles(storedAttachments.map((item) => item.fileId));
  } catch (error) {
    await SystemMailMessage.updateOne({ _id: message._id, scheduleStatus: "SENDING" }, { $set: { scheduleStatus: "PENDING" } });
    throw error;
  }
}
