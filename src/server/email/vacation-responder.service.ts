import mongoose from "mongoose";
import { prepareSystemMailboxDatabase } from "@/server/db/system-mailbox-indexes";
import { sendSystemMailboxEmail } from "@/server/email/mailer";
import { listSystemMailSenderIdentities, resolveSystemMailSender, touchSystemMailAlias } from "@/server/email/system-mail-alias.service";
import { AppError } from "@/server/errors/AppError";
import { enqueueJob } from "@/server/jobs/job.service";
import { SystemMailAutoReply } from "@/server/models/SystemMailAutoReply";
import { SystemMailAutoReplyThrottle } from "@/server/models/SystemMailAutoReplyThrottle";
import { SystemMailMessage } from "@/server/models/SystemMailMessage";
import { SystemMailSettings } from "@/server/models/SystemMailSettings";
import { SystemMailbox } from "@/server/models/SystemMailbox";

const ADDRESS_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;
const NO_REPLY_RE = /(?:^|[._+-])(no[-_.]?reply|do[-_.]?not[-_.]?reply|mailer[-_.]?daemon|postmaster|bounce|bounces)(?:[._+-]|$)/i;

export type VacationResponderSettingsDto = {
  enabled: boolean;
  enabledAt: string | null;
  startAt: string | null;
  endAt: string | null;
  subject: string;
  message: string;
  cooldownHours: number;
};

export type VacationResponderUpdate = {
  enabled?: boolean;
  startAt?: Date | null;
  endAt?: Date | null;
  subject?: string;
  message?: string;
  cooldownHours?: number;
};

function asIso(value: unknown) {
  return value ? new Date(value as Date).toISOString() : null;
}

function normalizeAddress(value: string) {
  const angle = value.match(/<([^<>\s]+@[^<>\s]+)>/);
  const plain = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return (angle?.[1] ?? plain?.[0] ?? value).trim().toLowerCase();
}

function isDuplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

function headersRecord(value: unknown) {
  if (!value || typeof value !== "object") return {} as Record<string, string>;
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key.toLowerCase()] = String(item ?? "").trim();
  }
  return result;
}

export function classifyVacationReplyEligibility(input: { from: string; mailboxAddress: string; rawHeaders?: unknown }) {
  const from = normalizeAddress(input.from);
  const mailboxAddress = normalizeAddress(input.mailboxAddress);
  if (!ADDRESS_RE.test(from)) return { eligible: false, reason: "invalid-sender" } as const;
  if (from === mailboxAddress) return { eligible: false, reason: "self-message" } as const;
  const localPart = from.split("@")[0] ?? "";
  if (NO_REPLY_RE.test(localPart)) return { eligible: false, reason: "no-reply-sender" } as const;

  const headers = headersRecord(input.rawHeaders);
  const autoSubmitted = (headers["auto-submitted"] ?? "").toLowerCase();
  if (autoSubmitted && autoSubmitted !== "no") return { eligible: false, reason: "auto-submitted" } as const;
  if (headers["x-researvia-auto-reply"]) return { eligible: false, reason: "researvia-auto-reply" } as const;
  const precedence = (headers.precedence ?? "").toLowerCase();
  if (/\b(?:bulk|junk|list|auto_reply|auto-reply)\b/.test(precedence)) return { eligible: false, reason: "bulk-or-list" } as const;
  if (headers["list-id"] || headers["list-unsubscribe"] || headers["mailing-list"]) return { eligible: false, reason: "mailing-list" } as const;
  const suppress = (headers["x-auto-response-suppress"] ?? "").toLowerCase();
  if (suppress && suppress !== "none") return { eligible: false, reason: "auto-response-suppressed" } as const;
  return { eligible: true, reason: null } as const;
}

async function ensureSettings(userId: string) {
  await prepareSystemMailboxDatabase();
  const row = await SystemMailSettings.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  ).lean();
  if (!row) throw new AppError("MAIL_SETTINGS_UNAVAILABLE", 500, "Vacation responder settings could not be loaded.");
  return row;
}

function settingsDto(row: Record<string, unknown>): VacationResponderSettingsDto {
  return {
    enabled: Boolean(row.vacationEnabled),
    enabledAt: asIso(row.vacationEnabledAt),
    startAt: asIso(row.vacationStartAt),
    endAt: asIso(row.vacationEndAt),
    subject: String(row.vacationSubject ?? ""),
    message: String(row.vacationMessage ?? ""),
    cooldownHours: Math.min(720, Math.max(1, Number(row.vacationCooldownHours ?? 24)))
  };
}

export async function getVacationResponderSettings(userId: string) {
  const row = await ensureSettings(userId);
  return settingsDto(row as unknown as Record<string, unknown>);
}

export async function updateVacationResponderSettings(userId: string, input: VacationResponderUpdate) {
  const current = await ensureSettings(userId);
  const nextMessage = typeof input.message === "string" ? input.message.trim().slice(0, 10000) : String(current.vacationMessage ?? "").trim();
  const nextStart = input.startAt === undefined ? (current.vacationStartAt ? new Date(current.vacationStartAt) : null) : input.startAt;
  const nextEnd = input.endAt === undefined ? (current.vacationEndAt ? new Date(current.vacationEndAt) : null) : input.endAt;
  if (nextStart && nextEnd && nextEnd.getTime() < nextStart.getTime()) {
    throw new AppError("VACATION_RANGE_INVALID", 400, "Vacation responder end time must be after the start time.");
  }
  const nextEnabled = input.enabled ?? Boolean(current.vacationEnabled);
  if (nextEnabled && !nextMessage) throw new AppError("VACATION_MESSAGE_REQUIRED", 400, "Add an automatic reply message before enabling the vacation responder.");

  const set: Record<string, unknown> = {};
  if (typeof input.enabled === "boolean") {
    set.vacationEnabled = input.enabled;
    if (input.enabled && !current.vacationEnabled) set.vacationEnabledAt = new Date();
    if (!input.enabled) set.vacationEnabledAt = null;
  }
  if (input.startAt !== undefined) set.vacationStartAt = input.startAt;
  if (input.endAt !== undefined) set.vacationEndAt = input.endAt;
  if (typeof input.subject === "string") set.vacationSubject = input.subject.replace(/[\r\n]+/g, " ").trim().slice(0, 500);
  if (typeof input.message === "string") set.vacationMessage = input.message.trim().slice(0, 10000);
  if (typeof input.cooldownHours === "number") set.vacationCooldownHours = Math.min(720, Math.max(1, Math.round(input.cooldownHours)));

  const row = await SystemMailSettings.findOneAndUpdate(
    { userId },
    { $set: set, $setOnInsert: { userId } },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
  ).lean();
  if (!row) throw new AppError("MAIL_SETTINGS_UNAVAILABLE", 500, "Vacation responder settings could not be saved.");
  return settingsDto(row as unknown as Record<string, unknown>);
}

function isActiveForMessage(settings: Record<string, unknown>, receivedAt: Date) {
  if (!settings.vacationEnabled || !String(settings.vacationMessage ?? "").trim()) return false;
  const enabledAt = settings.vacationEnabledAt ? new Date(settings.vacationEnabledAt as Date) : null;
  const startAt = settings.vacationStartAt ? new Date(settings.vacationStartAt as Date) : null;
  const endAt = settings.vacationEndAt ? new Date(settings.vacationEndAt as Date) : null;
  if (enabledAt && receivedAt.getTime() < enabledAt.getTime()) return false;
  if (startAt && receivedAt.getTime() < startAt.getTime()) return false;
  if (endAt && receivedAt.getTime() > endAt.getTime()) return false;
  return true;
}

async function markSkipped(userId: string, inboundMessageId: string, senderAddress: string, reason: string) {
  await SystemMailAutoReply.findOneAndUpdate(
    { userId, inboundMessageId },
    { $set: { senderAddress, status: "SKIPPED", reason, lastError: null }, $setOnInsert: { userId, inboundMessageId } },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
  );
  return { queued: false, reason };
}

export async function queueVacationReplyForInboundMessage(messageId: string) {
  if (!mongoose.isValidObjectId(messageId)) return { queued: false, reason: "invalid-message" };
  await prepareSystemMailboxDatabase();
  const message = await SystemMailMessage.findOne({ _id: messageId, direction: "INBOUND" }).lean();
  if (!message) return { queued: false, reason: "inbound-message-not-found" };
  const userId = String(message.userId);
  const settings = await SystemMailSettings.findOne({ userId }).lean();
  if (!settings?.vacationEnabled) return { queued: false, reason: "disabled" };
  const receivedAt = new Date(message.receivedAt ?? message.createdAt ?? new Date());
  if (!isActiveForMessage(settings as unknown as Record<string, unknown>, receivedAt)) return { queued: false, reason: "outside-window" };

  const mailbox = await SystemMailbox.findOne({ _id: message.mailboxId, userId, status: "ACTIVE" }).lean();
  if (!mailbox) return { queued: false, reason: "mailbox-unavailable" };
  const identities = await listSystemMailSenderIdentities(userId);
  const activeAddresses = new Set(identities.filter((identity) => identity.status === "ACTIVE").map((identity) => identity.address.toLowerCase()));
  const recipientIdentity = message.to.map(String).map(normalizeAddress).find((address) => activeAddresses.has(address)) ?? String(mailbox.address);
  const senderAddress = normalizeAddress(message.replyTo || message.from);
  const eligibility = classifyVacationReplyEligibility({ from: senderAddress, mailboxAddress: recipientIdentity, rawHeaders: message.rawHeaders });
  if (!eligibility.eligible) return markSkipped(userId, messageId, senderAddress || "unknown@example.invalid", eligibility.reason);

  const existing = await SystemMailAutoReply.findOne({ userId, inboundMessageId: message._id }).lean();
  if (existing) return { queued: existing.status === "QUEUED" || existing.status === "PROCESSING", reason: String(existing.reason ?? existing.status).toLowerCase() };

  let log;
  try {
    log = await SystemMailAutoReply.create({ userId, inboundMessageId: message._id, senderAddress, status: "QUEUED" });
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    const raced = await SystemMailAutoReply.findOne({ userId, inboundMessageId: message._id }).lean();
    return { queued: raced?.status === "QUEUED" || raced?.status === "PROCESSING", reason: "duplicate" };
  }
  const job = await enqueueJob({
    type: "SEND_VACATION_SYSTEM_MAIL",
    payload: { autoReplyId: String(log._id), inboundMessageId: messageId, userId },
    idempotencyKey: `vacation-reply:${messageId}`,
    maxAttempts: 5
  });
  await SystemMailAutoReply.updateOne({ _id: log._id }, { $set: { jobId: job._id } });
  return { queued: true, reason: null, autoReplyId: String(log._id), jobId: String(job._id) };
}

export async function queueVacationRepliesForRecentInbox(userId: string, limit = 120) {
  await prepareSystemMailboxDatabase();
  const settings = await SystemMailSettings.findOne({ userId }).lean();
  if (!settings?.vacationEnabled) return { scanned: 0, queued: 0 };
  const candidates = [settings.vacationEnabledAt, settings.vacationStartAt].filter(Boolean).map((value) => new Date(value as Date).getTime());
  const floor = candidates.length ? new Date(Math.max(...candidates)) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const messages = await SystemMailMessage.find({ userId, direction: "INBOUND", receivedAt: { $gte: floor } })
    .sort({ receivedAt: -1, createdAt: -1 })
    .limit(Math.min(200, Math.max(1, limit)))
    .select({ _id: 1 })
    .lean();
  let queued = 0;
  for (const message of messages) {
    const result = await queueVacationReplyForInboundMessage(String(message._id));
    if (result.queued) queued += 1;
  }
  return { scanned: messages.length, queued };
}

async function acquireSenderCooldown(userId: string, senderAddress: string, inboundMessageId: mongoose.Types.ObjectId, cooldownHours: number) {
  const now = new Date();
  const nextAllowedAt = new Date(now.getTime() + cooldownHours * 60 * 60 * 1000);
  try {
    const row = await SystemMailAutoReplyThrottle.findOneAndUpdate(
      {
        userId,
        senderAddress,
        $or: [{ nextAllowedAt: { $lte: now } }, { nextAllowedAt: { $exists: false } }]
      },
      {
        $set: { nextAllowedAt, lastInboundMessageId: inboundMessageId },
        $setOnInsert: { userId, senderAddress }
      },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    return Boolean(row);
  } catch (error) {
    if (isDuplicateKey(error)) return false;
    throw error;
  }
}

async function releaseSenderCooldown(userId: string, senderAddress: string, inboundMessageId: mongoose.Types.ObjectId) {
  await SystemMailAutoReplyThrottle.deleteOne({ userId, senderAddress, lastInboundMessageId: inboundMessageId });
}

function replySubject(template: string, original: string) {
  const cleanOriginal = original.replace(/[\r\n]+/g, " ").trim().slice(0, 400) || "(no subject)";
  const configured = template.replace(/\{\{subject\}\}/gi, cleanOriginal).replace(/[\r\n]+/g, " ").trim();
  return (configured || (/^re:/i.test(cleanOriginal) ? cleanOriginal : `Re: ${cleanOriginal}`)).slice(0, 500);
}

export async function processVacationSystemMail(autoReplyId: string) {
  if (!mongoose.isValidObjectId(autoReplyId)) throw new Error("Invalid vacation auto-reply id.");
  await prepareSystemMailboxDatabase();
  const log = await SystemMailAutoReply.findOneAndUpdate(
    { _id: autoReplyId, status: { $in: ["QUEUED", "FAILED"] } },
    { $set: { status: "PROCESSING", lastError: null } },
    { returnDocument: "after" }
  );
  if (!log) {
    const existing = await SystemMailAutoReply.findById(autoReplyId).lean();
    if (existing?.status === "SENT" || existing?.status === "SKIPPED") return { sent: existing.status === "SENT", reason: existing.reason ?? null };
    throw new Error("Vacation auto-reply is unavailable for processing.");
  }

  const userId = String(log.userId);
  const inbound = await SystemMailMessage.findOne({ _id: log.inboundMessageId, userId, direction: "INBOUND" }).lean();
  const settings = await SystemMailSettings.findOne({ userId }).lean();
  const mailbox = inbound ? await SystemMailbox.findOne({ _id: inbound.mailboxId, userId, status: "ACTIVE" }).lean() : null;
  if (!inbound || !settings || !mailbox) {
    await SystemMailAutoReply.updateOne({ _id: log._id }, { $set: { status: "SKIPPED", reason: "mailbox-or-message-unavailable" } });
    return { sent: false, reason: "mailbox-or-message-unavailable" };
  }

  const receivedAt = new Date(inbound.receivedAt ?? inbound.createdAt ?? new Date());
  if (!isActiveForMessage(settings as unknown as Record<string, unknown>, receivedAt)) {
    await SystemMailAutoReply.updateOne({ _id: log._id }, { $set: { status: "SKIPPED", reason: settings.vacationEnabled ? "outside-window" : "disabled" } });
    return { sent: false, reason: settings.vacationEnabled ? "outside-window" : "disabled" };
  }
  const identities = await listSystemMailSenderIdentities(userId);
  const activeAddresses = new Set(identities.filter((identity) => identity.status === "ACTIVE").map((identity) => identity.address.toLowerCase()));
  const requestedIdentity = inbound.to.map(String).map(normalizeAddress).find((address) => activeAddresses.has(address)) ?? null;
  const senderIdentity = await resolveSystemMailSender(userId, requestedIdentity);
  const senderAddress = normalizeAddress(inbound.replyTo || inbound.from);
  const eligibility = classifyVacationReplyEligibility({ from: senderAddress, mailboxAddress: senderIdentity.address, rawHeaders: inbound.rawHeaders });
  if (!eligibility.eligible) {
    await SystemMailAutoReply.updateOne({ _id: log._id }, { $set: { status: "SKIPPED", reason: eligibility.reason } });
    return { sent: false, reason: eligibility.reason };
  }

  const cooldownHours = Math.min(720, Math.max(1, Number(settings.vacationCooldownHours ?? 24)));
  const acquired = await acquireSenderCooldown(userId, senderAddress, inbound._id, cooldownHours);
  if (!acquired) {
    await SystemMailAutoReply.updateOne({ _id: log._id }, { $set: { status: "SKIPPED", reason: "sender-cooldown" } });
    return { sent: false, reason: "sender-cooldown" };
  }

  const domain = String(senderIdentity.address).split("@")[1] || "researvia.local";
  const deterministicMessageId = `<vacation-${String(inbound._id)}@${domain}>`;
  const subject = replySubject(String(settings.vacationSubject ?? ""), String(inbound.subject ?? ""));
  const text = String(settings.vacationMessage ?? "").trim().slice(0, 10000);
  const references = [...(inbound.references ?? []), inbound.internetMessageId].filter(Boolean).slice(-20);
  try {
    const result = await sendSystemMailboxEmail({
      fromAddress: senderIdentity.address,
      fromName: senderIdentity.displayName,
      replyTo: senderIdentity.replyTo,
      to: [senderAddress],
      subject,
      text,
      inReplyTo: inbound.internetMessageId,
      references,
      messageId: deterministicMessageId,
      headers: {
        "Auto-Submitted": "auto-replied",
        "X-Auto-Response-Suppress": "All",
        "Precedence": "bulk",
        "X-ResearVia-Auto-Reply": "vacation"
      }
    });
    if (!result.accepted.length) throw new Error("Vacation reply was rejected by the outbound mail provider.");
    const sentAt = new Date();
    await SystemMailAutoReply.updateOne({ _id: log._id }, { $set: { status: "SENT", reason: null, providerMessageId: result.messageId || deterministicMessageId, sentAt, lastError: null } });
    await Promise.all([
      SystemMailAutoReplyThrottle.updateOne({ userId, senderAddress, lastInboundMessageId: inbound._id }, { $set: { lastSentAt: sentAt } }),
      touchSystemMailAlias(senderIdentity.aliasId, "lastSentAt", sentAt)
    ]);

    try {
      const outbound = await SystemMailMessage.findOneAndUpdate(
        { mailboxId: mailbox._id, internetMessageId: deterministicMessageId },
        {
          $setOnInsert: {
            userId,
            mailboxId: mailbox._id,
            internetMessageId: deterministicMessageId,
            providerMessageId: result.messageId || deterministicMessageId,
            source: "SYSTEM",
            threadKey: inbound.threadKey,
            inReplyTo: inbound.internetMessageId,
            references,
            direction: "OUTBOUND",
            folder: "SENT",
            from: senderIdentity.address,
            to: [senderAddress],
            cc: [],
            subject,
            textBody: text,
            snippet: text.slice(0, 500),
            attachments: [],
            readAt: sentAt,
            sentAt,
            rawHeaders: { "auto-submitted": "auto-replied", "x-researvia-auto-reply": "vacation" }
          }
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      ).lean();
      if (outbound) await SystemMailAutoReply.updateOne({ _id: log._id }, { $set: { outboundMessageId: outbound._id } });
    } catch (storageError) {
      const message = storageError instanceof Error ? `Sent successfully; Sent-folder persistence warning: ${storageError.message}` : "Sent successfully; Sent-folder persistence warning.";
      await SystemMailAutoReply.updateOne({ _id: log._id }, { $set: { lastError: message.slice(0, 2000) } });
    }
    return { sent: true, messageId: result.messageId || deterministicMessageId };
  } catch (error) {
    await releaseSenderCooldown(userId, senderAddress, inbound._id);
    const message = error instanceof Error ? error.message.slice(0, 2000) : "Vacation reply delivery failed.";
    await SystemMailAutoReply.updateOne({ _id: log._id }, { $set: { status: "FAILED", lastError: message } });
    throw error;
  }
}
