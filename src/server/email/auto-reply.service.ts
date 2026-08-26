import mongoose from "mongoose";
import { prepareSystemMailboxDatabase } from "@/server/db/system-mailbox-indexes";
import { sendSystemMailMessage } from "@/server/email/system-mailbox.service";
import { AppError } from "@/server/errors/AppError";
import { enqueueJob } from "@/server/jobs/job.service";
import { MailAutoReplyReceipt } from "@/server/models/MailAutoReplyReceipt";
import { SystemMailbox } from "@/server/models/SystemMailbox";
import { SystemMailMessage } from "@/server/models/SystemMailMessage";
import { SystemMailSettings } from "@/server/models/SystemMailSettings";

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const ADDRESS_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;

function isDuplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

function headersOf(value: unknown) {
  if (!value || typeof value !== "object") return {} as Record<string, string>;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key.toLowerCase(), String(item ?? "")])) as Record<string, string>;
}

function settingsActive(settings: { autoReplyEnabled?: boolean; autoReplyText?: string; autoReplyStartsAt?: Date | null; autoReplyEndsAt?: Date | null }, now = new Date()) {
  if (!settings.autoReplyEnabled || !settings.autoReplyText?.trim()) return false;
  if (settings.autoReplyStartsAt && new Date(settings.autoReplyStartsAt).getTime() > now.getTime()) return false;
  if (settings.autoReplyEndsAt && new Date(settings.autoReplyEndsAt).getTime() < now.getTime()) return false;
  return true;
}

function suppressForHeaders(headers: Record<string, string>) {
  const autoSubmitted = headers["auto-submitted"]?.trim().toLowerCase();
  if (autoSubmitted && autoSubmitted !== "no") return true;
  const precedence = headers.precedence?.toLowerCase() ?? "";
  if (/\b(bulk|junk|list)\b/.test(precedence)) return true;
  if (headers["list-id"] || headers["list-unsubscribe"]) return true;
  if (/all|oof|autoreply/i.test(headers["x-auto-response-suppress"] ?? "")) return true;
  return false;
}

function suppressForSender(sender: string) {
  if (!ADDRESS_RE.test(sender)) return true;
  const local = sender.split("@")[0].toLowerCase();
  return /^(mailer-daemon|postmaster|no-?reply|do-?not-?reply|bounce|notifications?)$/.test(local);
}

export async function evaluateAutoReplyForInbound(userId: string, messageId: string) {
  if (!mongoose.isValidObjectId(messageId)) return { queued: false, reason: "invalid-message" };
  await prepareSystemMailboxDatabase();
  const [settings, message, mailbox] = await Promise.all([
    SystemMailSettings.findOne({ userId }).lean(),
    SystemMailMessage.findOne({ _id: messageId, userId, direction: "INBOUND", folder: { $ne: "TRASH" } }).lean(),
    SystemMailbox.findOne({ userId }).select({ address: 1 }).lean()
  ]);
  const now = new Date();
  if (!settings || !settingsActive(settings, now)) return { queued: false, reason: "disabled-or-inactive" };
  if (!message) return { queued: false, reason: "message-not-found" };
  const sender = String(message.replyTo || message.from || "").trim().toLowerCase();
  if (suppressForSender(sender) || sender === String(mailbox?.address ?? "").toLowerCase()) return { queued: false, reason: "sender-suppressed" };
  if (suppressForHeaders(headersOf(message.rawHeaders))) return { queued: false, reason: "header-suppressed" };

  let receipt;
  try {
    receipt = await MailAutoReplyReceipt.findOneAndUpdate(
      { userId, sender, $or: [{ nextEligibleAt: { $lte: now } }, { nextEligibleAt: { $exists: false } }] },
      { $set: { status: "PENDING", nextEligibleAt: new Date(now.getTime() + COOLDOWN_MS), lastInboundMessageId: message._id, lastReplyMessageId: null, lastError: null, sentAt: null } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
  } catch (error) {
    if (isDuplicateKey(error)) return { queued: false, reason: "cooldown" };
    throw error;
  }
  if (!receipt) return { queued: false, reason: "cooldown" };
  try {
    await enqueueJob({
      type: "SEND_SYSTEM_AUTO_REPLY",
      payload: { receiptId: String(receipt._id) },
      idempotencyKey: `system-auto-reply:${String(receipt._id)}:${String(message._id)}`,
      maxAttempts: 4
    });
  } catch (error) {
    await MailAutoReplyReceipt.updateOne({ _id: receipt._id }, { $set: { status: "FAILED", nextEligibleAt: now, lastError: "Auto-reply job could not be queued." } });
    throw error;
  }
  return { queued: true, receiptId: String(receipt._id) };
}

export async function processSystemAutoReply(receiptId: string) {
  if (!mongoose.isValidObjectId(receiptId)) throw new AppError("MAIL_AUTO_REPLY_NOT_FOUND", 404, "Auto-reply receipt not found.");
  await prepareSystemMailboxDatabase();
  const receipt = await MailAutoReplyReceipt.findOne({ _id: receiptId, status: "PENDING" });
  if (!receipt) return { skipped: true };
  const [settings, inbound] = await Promise.all([
    SystemMailSettings.findOne({ userId: receipt.userId }).lean(),
    SystemMailMessage.findOne({ _id: receipt.lastInboundMessageId, userId: receipt.userId, direction: "INBOUND" }).lean()
  ]);
  if (!settings || !settingsActive(settings) || !inbound) {
    await MailAutoReplyReceipt.updateOne({ _id: receipt._id }, { $set: { status: "FAILED", nextEligibleAt: new Date(), lastError: "Auto-reply became inactive before delivery." } });
    return { skipped: true };
  }
  const recipient = String(inbound.replyTo || inbound.from || "").trim().toLowerCase();
  if (suppressForSender(recipient)) {
    await MailAutoReplyReceipt.updateOne({ _id: receipt._id }, { $set: { status: "FAILED", nextEligibleAt: new Date(), lastError: "Recipient is not eligible for automatic replies." } });
    return { skipped: true };
  }
  const subject = String(settings.autoReplySubject || "Automatic reply").trim().slice(0, 500) || "Automatic reply";
  try {
    const sent = await sendSystemMailMessage(String(receipt.userId), {
      to: [recipient],
      cc: [],
      subject,
      text: String(settings.autoReplyText).trim(),
      replyToMessageId: String(inbound._id),
      draftId: null
    });
    await MailAutoReplyReceipt.updateOne({ _id: receipt._id }, { $set: { status: "SENT", sentAt: new Date(), lastReplyMessageId: sent.id, lastError: null } });
    return { skipped: false, messageId: sent.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message.slice(0, 1000) : "Automatic reply failed.";
    await MailAutoReplyReceipt.updateOne({ _id: receipt._id }, { $set: { status: "FAILED", nextEligibleAt: new Date(), lastError: errorMessage } });
    throw error;
  }
}

export async function scanSystemAutoReplyCandidates() {
  await prepareSystemMailboxDatabase();
  const now = new Date();
  const settingsRows = await SystemMailSettings.find({ autoReplyEnabled: true }).select({ userId: 1, autoReplyLastScanAt: 1 }).limit(500).lean();
  let examined = 0;
  let queued = 0;
  for (const settings of settingsRows) {
    const userId = String(settings.userId);
    const floor = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const storedCursor = settings.autoReplyLastScanAt ? new Date(settings.autoReplyLastScanAt) : floor;
    const since = storedCursor.getTime() < floor.getTime() ? floor : storedCursor;
    const messages = await SystemMailMessage.find({ userId, direction: "INBOUND", createdAt: { $gt: since, $lte: now } })
      .select({ _id: 1, createdAt: 1 })
      .sort({ createdAt: 1, _id: 1 })
      .limit(100)
      .lean();
    for (const message of messages) {
      const result = await evaluateAutoReplyForInbound(userId, String(message._id));
      examined += 1;
      if (result.queued) queued += 1;
    }
    const cursor = messages.length === 100 && messages.at(-1)?.createdAt ? new Date(messages.at(-1)!.createdAt) : now;
    await SystemMailSettings.updateOne({ userId }, { $set: { autoReplyLastScanAt: cursor } });
  }
  return { users: settingsRows.length, examined, queued };
}
