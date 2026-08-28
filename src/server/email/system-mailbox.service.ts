import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import mongoose from "mongoose";
import { getServerEnv } from "@/config/env";
import { prepareSystemMailboxDatabase } from "@/server/db/system-mailbox-indexes";
import { AppError } from "@/server/errors/AppError";
import { sendSystemMailboxEmail } from "@/server/email/mailer";
import { listSystemMailSenderIdentities, resolveSystemMailRecipient, resolveSystemMailSender, touchSystemMailAlias } from "@/server/email/system-mail-alias.service";
import { enqueueJob } from "@/server/jobs/job.service";
import { SystemMailAlias } from "@/server/models/SystemMailAlias";
import { SystemMailbox } from "@/server/models/SystemMailbox";
import { SystemMailMessage } from "@/server/models/SystemMailMessage";
import { User } from "@/server/models/User";
import { notifyUser } from "@/server/notifications/notification.service";

export type SystemMailFolder = "INBOX" | "STARRED" | "SENT" | "DRAFTS" | "TRASH";
const ADDRESS_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;
const MAX_RECIPIENTS = 20;
const MAX_BODY_CHARS = 200_000;

function mailboxDomain() {
  const domain = getServerEnv().SYSTEM_MAIL_DOMAIN?.trim().toLowerCase();
  if (!domain) throw new AppError("SYSTEM_MAIL_NOT_CONFIGURED", 503, "System mailbox domain is not configured.");
  return domain;
}

function normalizeAddress(value: string) {
  const angle = value.match(/<([^<>\s]+@[^<>\s]+)>/);
  const plain = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return (angle?.[1] ?? plain?.[0] ?? value).trim().toLowerCase();
}

function normalizeAddressList(values: string[]) {
  return [...new Set(values.map(normalizeAddress).filter((value) => ADDRESS_RE.test(value)))];
}

function localBase(displayName: string, email: string) {
  const normalized = displayName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const words = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  const preferred = words.at(-1) || email.split("@")[0] || "student";
  const clean = preferred.replace(/[^a-z0-9]/g, "").slice(0, 24);
  return clean.length >= 3 ? clean : `user${clean}`.slice(0, 24);
}

function isDuplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

export async function ensureSystemMailbox(userId: string) {
  await prepareSystemMailboxDatabase();
  const existing = await SystemMailbox.findOne({ userId }).lean();
  if (existing) return existing;

  const user = await User.findOne({ _id: userId, status: "ACTIVE" }).select({ displayName: 1, email: 1 }).lean();
  if (!user) throw new AppError("ACCOUNT_UNAVAILABLE", 404, "Active user account not found.");
  const domain = mailboxDomain();
  const base = localBase(String(user.displayName), String(user.email));

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const suffix = attempt < 25 ? randomInt(1000, 10_000).toString() : randomInt(100_000, 1_000_000).toString();
    const localPart = `${base}${suffix}`.slice(0, 63);
    const address = `${localPart}@${domain}`;
    if (await SystemMailAlias.exists({ address })) continue;
    try {
      return await SystemMailbox.create({
        userId,
        localPart,
        address,
        displayName: user.displayName,
        status: "ACTIVE"
      });
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      const raced = await SystemMailbox.findOne({ userId }).lean();
      if (raced) return raced;
    }
  }
  throw new AppError("MAILBOX_PROVISION_FAILED", 500, "A unique system mailbox address could not be created.");
}

function serializeMailbox(mailbox: Record<string, unknown>) {
  return {
    id: String(mailbox._id),
    address: String(mailbox.address),
    displayName: String(mailbox.displayName),
    status: String(mailbox.status),
    quotaBytes: Number(mailbox.quotaBytes ?? 0),
    usedBytes: Number(mailbox.usedBytes ?? 0)
  };
}

function serializeMessage(message: Record<string, unknown>) {
  return {
    id: String(message._id),
    internetMessageId: String(message.internetMessageId ?? ""),
    threadKey: String(message.threadKey ?? ""),
    direction: String(message.direction),
    folder: String(message.folder),
    from: String(message.from),
    to: Array.isArray(message.to) ? message.to.map(String) : [],
    cc: Array.isArray(message.cc) ? message.cc.map(String) : [],
    replyTo: message.replyTo ? String(message.replyTo) : null,
    subject: String(message.subject ?? ""),
    textBody: String(message.textBody ?? ""),
    snippet: String(message.snippet ?? ""),
    attachments: Array.isArray(message.attachments)
      ? message.attachments.map((item) => {
          const row = item as Record<string, unknown>;
          return { fileId: String(row.fileId), filename: String(row.filename), contentType: String(row.contentType), size: Number(row.size ?? 0) };
        })
      : [],
    readAt: message.readAt ? new Date(message.readAt as Date).toISOString() : null,
    starredAt: message.starredAt ? new Date(message.starredAt as Date).toISOString() : null,
    sentAt: message.sentAt ? new Date(message.sentAt as Date).toISOString() : null,
    receivedAt: message.receivedAt ? new Date(message.receivedAt as Date).toISOString() : null,
    createdAt: message.createdAt ? new Date(message.createdAt as Date).toISOString() : null
  };
}

export async function listSystemMailbox(userId: string, input: { folder?: SystemMailFolder; query?: string; limit?: number } = {}) {
  const mailbox = await ensureSystemMailbox(userId);
  const folder = input.folder ?? "INBOX";
  const filter: Record<string, unknown> = { userId };
  if (folder === "STARRED") {
    filter.starredAt = { $ne: null };
    filter.folder = { $ne: "TRASH" };
  } else {
    filter.folder = folder;
  }

  const query = input.query?.trim();
  if (query) filter.$text = { $search: query.slice(0, 200) };

  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const [senders, messages, inboxUnread, inboxCount, starredCount, sentCount, draftCount, trashCount] = await Promise.all([
    listSystemMailSenderIdentities(userId),
    SystemMailMessage.find(filter).sort({ receivedAt: -1, sentAt: -1, createdAt: -1 }).limit(limit).lean(),
    SystemMailMessage.countDocuments({ userId, folder: "INBOX", readAt: null }),
    SystemMailMessage.countDocuments({ userId, folder: "INBOX" }),
    SystemMailMessage.countDocuments({ userId, starredAt: { $ne: null }, folder: { $ne: "TRASH" } }),
    SystemMailMessage.countDocuments({ userId, folder: "SENT" }),
    SystemMailMessage.countDocuments({ userId, folder: "DRAFTS" }),
    SystemMailMessage.countDocuments({ userId, folder: "TRASH" })
  ]);

  return {
    mailbox: serializeMailbox(mailbox.toObject ? mailbox.toObject() as Record<string, unknown> : mailbox as unknown as Record<string, unknown>),
    senders,
    counts: { inboxUnread, inbox: inboxCount, starred: starredCount, sent: sentCount, drafts: draftCount, trash: trashCount },
    messages: messages.map((item) => serializeMessage(item as unknown as Record<string, unknown>))
  };
}

export async function getSystemMailThread(userId: string, messageId: string) {
  if (!mongoose.isValidObjectId(messageId)) throw new AppError("MAIL_NOT_FOUND", 404, "Message not found.");
  await prepareSystemMailboxDatabase();
  const message = await SystemMailMessage.findOne({ _id: messageId, userId }).lean();
  if (!message) throw new AppError("MAIL_NOT_FOUND", 404, "Message not found.");
  const thread = await SystemMailMessage.find({ userId, threadKey: message.threadKey, folder: { $ne: "TRASH" } }).sort({ createdAt: 1 }).lean();
  return {
    message: serializeMessage(message as unknown as Record<string, unknown>),
    thread: thread.map((item) => serializeMessage(item as unknown as Record<string, unknown>))
  };
}

export async function updateSystemMailMessage(userId: string, messageId: string, input: { read?: boolean; starred?: boolean; folder?: "INBOX" | "SENT" | "DRAFTS" | "TRASH" }) {
  if (!mongoose.isValidObjectId(messageId)) throw new AppError("MAIL_NOT_FOUND", 404, "Message not found.");
  await prepareSystemMailboxDatabase();
  const set: Record<string, unknown> = {};
  if (typeof input.read === "boolean") set.readAt = input.read ? new Date() : null;
  if (typeof input.starred === "boolean") set.starredAt = input.starred ? new Date() : null;
  if (input.folder) set.folder = input.folder;
  const item = await SystemMailMessage.findOneAndUpdate({ _id: messageId, userId }, { $set: set }, { new: true, runValidators: true }).lean();
  if (!item) throw new AppError("MAIL_NOT_FOUND", 404, "Message not found.");
  return serializeMessage(item as unknown as Record<string, unknown>);
}

function safeFileName(value: string) {
  return value.replace(/[\\/\0\r\n]+/g, "_").slice(0, 255) || "attachment";
}

async function mailAttachmentBucket() {
  const connection = await prepareSystemMailboxDatabase().then(() => mongoose.connection);
  const db = connection.db;
  if (!db) throw new AppError("DATABASE_UNAVAILABLE", 503, "Mailbox attachment storage is unavailable.");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: "systemMailAttachments" });
}

function validateFiles(files: File[]) {
  const maxEach = getServerEnv().SYSTEM_MAIL_MAX_ATTACHMENT_MB * 1024 * 1024;
  if (files.length > 10) throw new AppError("MAIL_ATTACHMENT_LIMIT", 400, "A message can include at most 10 attachments.");
  for (const file of files) {
    if (file.size < 1 || file.size > maxEach) throw new AppError("MAIL_ATTACHMENT_SIZE", 400, `Each attachment must be ${getServerEnv().SYSTEM_MAIL_MAX_ATTACHMENT_MB} MB or smaller.`);
  }
}

async function persistFiles(userId: string, files: File[]) {
  validateFiles(files);
  const bucket = await mailAttachmentBucket();
  const saved: Array<{ fileId: mongoose.Types.ObjectId; filename: string; contentType: string; size: number }> = [];
  try {
    for (const file of files) {
      const filename = safeFileName(file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = bucket.openUploadStream(filename, { metadata: { userId, contentType: file.type || "application/octet-stream" } });
      await new Promise<void>((resolve, reject) => stream.end(buffer, (error?: Error | null) => error ? reject(error) : resolve()));
      saved.push({ fileId: stream.id, filename, contentType: file.type || "application/octet-stream", size: file.size });
    }
    return saved;
  } catch (error) {
    await Promise.all(saved.map((item) => bucket.delete(item.fileId).catch(() => undefined)));
    throw error;
  }
}

async function fileBuffers(files: File[]) {
  validateFiles(files);
  return Promise.all(files.map(async (file) => ({ filename: safeFileName(file.name), contentType: file.type || "application/octet-stream", content: Buffer.from(await file.arrayBuffer()) })));
}

function snippet(text: string, html = "") {
  const plain = text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return plain.trim().slice(0, 500);
}

function safeSubject(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 500);
}

function ensureRecipients(values: string[]) {
  const normalized = normalizeAddressList(values);
  if (normalized.length === 0) throw new AppError("MAIL_RECIPIENT_REQUIRED", 400, "Add at least one valid recipient.");
  if (normalized.length > MAX_RECIPIENTS) throw new AppError("MAIL_RECIPIENT_LIMIT", 400, `A message can have at most ${MAX_RECIPIENTS} recipients.`);
  return normalized;
}

export async function saveSystemMailDraft(userId: string, input: { id?: string; fromAddress?: string; to?: string[]; cc?: string[]; subject?: string; text?: string }) {
  const mailbox = await ensureSystemMailbox(userId);
  const sender = await resolveSystemMailSender(userId, input.fromAddress ?? null);
  const payload = {
    from: sender.address,
    to: normalizeAddressList(input.to ?? []),
    cc: normalizeAddressList(input.cc ?? []),
    subject: safeSubject(input.subject ?? ""),
    textBody: (input.text ?? "").slice(0, MAX_BODY_CHARS),
    snippet: snippet((input.text ?? "").slice(0, MAX_BODY_CHARS)),
    direction: "DRAFT" as const,
    folder: "DRAFTS" as const,
    readAt: new Date()
  };

  if (input.id) {
    if (!mongoose.isValidObjectId(input.id)) throw new AppError("MAIL_NOT_FOUND", 404, "Draft not found.");
    const updated = await SystemMailMessage.findOneAndUpdate({ _id: input.id, userId, folder: "DRAFTS" }, { $set: payload }, { new: true, runValidators: true }).lean();
    if (!updated) throw new AppError("MAIL_NOT_FOUND", 404, "Draft not found.");
    return serializeMessage(updated as unknown as Record<string, unknown>);
  }

  const id = randomUUID();
  const created = await SystemMailMessage.create({
    userId,
    mailboxId: mailbox._id,
    internetMessageId: `draft-${id}@${mailboxDomain()}`,
    threadKey: `draft-${id}`,
    ...payload
  });
  return serializeMessage(created.toObject() as unknown as Record<string, unknown>);
}

export async function sendSystemMailMessage(userId: string, input: { fromAddress?: string | null; to: string[]; cc?: string[]; subject: string; text: string; replyToMessageId?: string | null; draftId?: string | null }, files: File[] = []) {
  const mailbox = await ensureSystemMailbox(userId);
  if (mailbox.status !== "ACTIVE") throw new AppError("MAILBOX_UNAVAILABLE", 403, "This system mailbox is not active.");
  const to = ensureRecipients(input.to);
  const cc = normalizeAddressList(input.cc ?? []);
  if (to.length + cc.length > MAX_RECIPIENTS) throw new AppError("MAIL_RECIPIENT_LIMIT", 400, `A message can have at most ${MAX_RECIPIENTS} recipients.`);
  const text = input.text.trim().slice(0, MAX_BODY_CHARS);
  if (!text) throw new AppError("MAIL_BODY_REQUIRED", 400, "Message body is required.");

  let parent: Awaited<ReturnType<typeof SystemMailMessage.findOne>> | null = null;
  if (input.replyToMessageId) {
    if (!mongoose.isValidObjectId(input.replyToMessageId)) throw new AppError("MAIL_NOT_FOUND", 404, "Reply target not found.");
    parent = await SystemMailMessage.findOne({ _id: input.replyToMessageId, userId });
    if (!parent) throw new AppError("MAIL_NOT_FOUND", 404, "Reply target not found.");
  }

  let requestedFrom = input.fromAddress ?? null;
  if (!requestedFrom && parent?.direction === "INBOUND") {
    const identities = await listSystemMailSenderIdentities(userId);
    const activeAddresses = new Set(identities.filter((identity) => identity.status === "ACTIVE").map((identity) => identity.address.toLowerCase()));
    requestedFrom = parent.to.map(String).map(normalizeAddress).find((address) => activeAddresses.has(address)) ?? null;
  }
  const sender = await resolveSystemMailSender(userId, requestedFrom);
  const attachmentsForSend = await fileBuffers(files);
  const subject = safeSubject(input.subject || parent?.subject || "(no subject)");
  const references = parent ? [...(parent.references ?? []), parent.internetMessageId].filter(Boolean).slice(-20) : [];
  const result = await sendSystemMailboxEmail({
    fromAddress: sender.address,
    fromName: sender.displayName,
    replyTo: sender.replyTo,
    to,
    cc,
    subject,
    text,
    inReplyTo: parent?.internetMessageId ?? null,
    references,
    attachments: attachmentsForSend
  });

  const savedAttachments = await persistFiles(userId, files);
  const internetMessageId = result.messageId || `<${randomUUID()}@${mailboxDomain()}>`;
  const threadKey = parent?.threadKey || internetMessageId;
  try {
    const message = await SystemMailMessage.create({
      userId,
      mailboxId: mailbox._id,
      internetMessageId,
      providerMessageId: result.messageId,
      threadKey,
      inReplyTo: parent?.internetMessageId ?? null,
      references,
      direction: "OUTBOUND",
      folder: "SENT",
      from: sender.address,
      to,
      cc,
      subject,
      textBody: text,
      snippet: snippet(text),
      attachments: savedAttachments,
      readAt: new Date(),
      sentAt: new Date()
    });
    if (input.draftId && mongoose.isValidObjectId(input.draftId)) await SystemMailMessage.deleteOne({ _id: input.draftId, userId, folder: "DRAFTS" });
    const sentAt = new Date();
    await Promise.all([
      SystemMailbox.updateOne({ _id: mailbox._id }, { $set: { lastSentAt: sentAt }, $inc: { usedBytes: savedAttachments.reduce((sum, item) => sum + item.size, 0) } }),
      touchSystemMailAlias(sender.aliasId, "lastSentAt", sentAt)
    ]);
    return serializeMessage(message.toObject() as unknown as Record<string, unknown>);
  } catch (error) {
    const bucket = await mailAttachmentBucket();
    await Promise.all(savedAttachments.map((item) => bucket.delete(item.fileId).catch(() => undefined)));
    throw error;
  }
}

function headersFromMailgun(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return new Map<string, string>();
  try {
    const rows = JSON.parse(value) as Array<[string, string]>;
    return new Map(rows.map(([key, item]) => [String(key).toLowerCase(), String(item)]));
  } catch {
    return new Map<string, string>();
  }
}

export function verifyMailgunInboundSignature(input: { timestamp: string; token: string; signature: string }) {
  const key = getServerEnv().MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!key) throw new AppError("MAIL_INBOUND_NOT_CONFIGURED", 503, "Inbound mailbox verification is not configured.");
  const seconds = Number(input.timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() - seconds * 1000) > 15 * 60 * 1000) return false;
  const expected = createHmac("sha256", key).update(`${input.timestamp}${input.token}`).digest("hex");
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(input.signature || "", "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function receiveMailgunMessage(form: FormData) {
  await prepareSystemMailboxDatabase();
  const domain = mailboxDomain();
  const recipient = normalizeAddress(String(form.get("recipient") ?? ""));
  if (!recipient.endsWith(`@${domain}`)) return { accepted: false, reason: "recipient-domain-mismatch" };
  const resolvedRecipient = await resolveSystemMailRecipient(recipient);
  if (!resolvedRecipient) return { accepted: false, reason: "unknown-mailbox" };
  const { mailbox, alias } = resolvedRecipient;

  const headers = headersFromMailgun(form.get("message-headers"));
  const token = String(form.get("token") ?? randomUUID());
  const internetMessageId = headers.get("message-id") || `<mailgun-${token}@${domain}>`;
  const existing = await SystemMailMessage.findOne({ mailboxId: mailbox._id, internetMessageId }).lean();
  if (existing) return { accepted: true, duplicate: true, messageId: String(existing._id) };

  const from = normalizeAddress(String(form.get("from") ?? form.get("sender") ?? "unknown@example.invalid"));
  const replyTo = headers.get("reply-to") ? normalizeAddress(headers.get("reply-to") as string) : null;
  const subject = safeSubject(String(form.get("subject") ?? "(no subject)"));
  const textBody = String(form.get("stripped-text") ?? form.get("body-plain") ?? "").slice(0, MAX_BODY_CHARS);
  const htmlBody = String(form.get("stripped-html") ?? form.get("body-html") ?? "").slice(0, 500_000);
  const inReplyTo = headers.get("in-reply-to") || null;
  const references = (headers.get("references") ?? "").split(/\s+/).filter(Boolean).slice(-20);
  const threadParent = inReplyTo
    ? await SystemMailMessage.findOne({ userId: mailbox.userId, internetMessageId: inReplyTo }).lean()
    : references.length
      ? await SystemMailMessage.findOne({ userId: mailbox.userId, internetMessageId: { $in: references } }).sort({ createdAt: -1 }).lean()
      : null;
  const threadKey = threadParent?.threadKey || internetMessageId;

  const files: File[] = [];
  for (const [, value] of form.entries()) if (typeof value !== "string" && value instanceof File) files.push(value);
  const savedAttachments = await persistFiles(String(mailbox.userId), files);

  try {
    const message = await SystemMailMessage.create({
      userId: mailbox.userId,
      mailboxId: mailbox._id,
      internetMessageId,
      providerMessageId: token,
      threadKey,
      inReplyTo,
      references,
      direction: "INBOUND",
      folder: "INBOX",
      from,
      to: [recipient],
      cc: normalizeAddressList(String(headers.get("cc") ?? "").split(",")),
      replyTo,
      subject,
      textBody,
      htmlBody,
      snippet: snippet(textBody, htmlBody),
      attachments: savedAttachments,
      readAt: null,
      receivedAt: new Date(),
      rawHeaders: Object.fromEntries(headers)
    });

    const receivedAt = new Date();
    await Promise.all([
      SystemMailbox.updateOne({ _id: mailbox._id }, { $set: { lastReceivedAt: receivedAt }, $inc: { usedBytes: savedAttachments.reduce((sum, item) => sum + item.size, 0) } }),
      touchSystemMailAlias(alias ? String(alias._id) : null, "lastReceivedAt", receivedAt)
    ]);
    const notification = await notifyUser({
      userId: String(mailbox.userId),
      type: "SYSTEM_MAIL",
      title: `New email: ${subject || "(no subject)"}`,
      message: `${from} — ${snippet(textBody, htmlBody).slice(0, 220)}`,
      href: `/dashboard/mail?message=${String(message._id)}`,
      dedupeKey: `system-mail:${String(message._id)}`,
      metadata: { messageId: String(message._id), from, subject, mailboxAddress: recipient }
    });
    await enqueueJob({
      type: "SEND_PUSH_NOTIFICATION",
      payload: { notificationId: String(notification._id) },
      idempotencyKey: `push-notification:${String(notification._id)}`,
      maxAttempts: 5
    });
    return { accepted: true, duplicate: false, messageId: String(message._id) };
  } catch (error) {
    const bucket = await mailAttachmentBucket();
    await Promise.all(savedAttachments.map((item) => bucket.delete(item.fileId).catch(() => undefined)));
    if (isDuplicateKey(error)) return { accepted: true, duplicate: true };
    throw error;
  }
}

export async function readSystemMailAttachment(userId: string, messageId: string, fileId: string) {
  if (!mongoose.isValidObjectId(messageId) || !mongoose.isValidObjectId(fileId)) throw new AppError("MAIL_ATTACHMENT_NOT_FOUND", 404, "Attachment not found.");
  await prepareSystemMailboxDatabase();
  const message = await SystemMailMessage.findOne({ _id: messageId, userId }).lean();
  const attachment = message?.attachments?.find((item) => String(item.fileId) === fileId);
  if (!attachment) throw new AppError("MAIL_ATTACHMENT_NOT_FOUND", 404, "Attachment not found.");
  const bucket = await mailAttachmentBucket();
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const stream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  return { buffer: Buffer.concat(chunks), filename: attachment.filename, contentType: attachment.contentType };
}
