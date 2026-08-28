import { createHash } from "node:crypto";
import { connectDatabase } from "@/server/db/mongoose";
import { AppError } from "@/server/errors/AppError";
import { MailDeliveryEvent } from "@/server/models/MailDeliveryEvent";
import { MailSuppression } from "@/server/models/MailSuppression";
import { enforceRateLimitUnits } from "@/server/security/rate-limit";

const ADDRESS_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export type OutboundMailPolicy = "GENERAL" | "OUTREACH";
export type MailgunDeliveryFeedback = {
  providerEventId?: string | null;
  event: string;
  recipient: string;
  messageId?: string | null;
  severity?: string | null;
  reason?: string | null;
  description?: string | null;
  timestamp?: number | string | null;
};

function normalizeAddress(value: string) {
  const angle = value.match(/<([^<>\s]+@[^<>\s]+)>/);
  const plain = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return (angle?.[1] ?? plain?.[0] ?? value).trim().toLowerCase();
}

function normalizeRecipients(values: string[]) {
  return [...new Set(values.map(normalizeAddress).filter((value) => ADDRESS_RE.test(value)))];
}

function safeDetail(...parts: Array<string | null | undefined>) {
  return parts.map((part) => String(part ?? "").trim()).filter(Boolean).join(" — ").slice(0, 2000);
}

function eventType(value: string) {
  const event = value.trim().toLowerCase();
  if (event === "accepted") return "ACCEPTED" as const;
  if (event === "delivered") return "DELIVERED" as const;
  if (event === "failed") return "FAILED" as const;
  if (event === "complained") return "COMPLAINED" as const;
  if (event === "unsubscribed") return "UNSUBSCRIBED" as const;
  return "OTHER" as const;
}

function eventSeverity(type: ReturnType<typeof eventType>, severity?: string | null) {
  if (type === "COMPLAINED" || type === "UNSUBSCRIBED") return "CRITICAL" as const;
  if (type === "FAILED" && String(severity ?? "").toLowerCase() === "permanent") return "CRITICAL" as const;
  if (type === "FAILED") return "WARNING" as const;
  return "INFO" as const;
}

function suppressionReason(type: ReturnType<typeof eventType>, severity?: string | null) {
  if (type === "COMPLAINED") return "COMPLAINT" as const;
  if (type === "UNSUBSCRIBED") return "UNSUBSCRIBE" as const;
  if (type === "FAILED" && String(severity ?? "").toLowerCase() === "permanent") return "BOUNCE" as const;
  return null;
}

function eventId(input: MailgunDeliveryFeedback, recipient: string, occurredAt: Date) {
  const supplied = String(input.providerEventId ?? "").trim();
  if (supplied) return supplied.slice(0, 500);
  return createHash("sha256")
    .update([input.event, recipient, input.messageId ?? "", occurredAt.toISOString(), input.reason ?? "", input.description ?? ""].join("|"))
    .digest("base64url");
}

function occurredAt(value: MailgunDeliveryFeedback["timestamp"]) {
  if (value === null || value === undefined || value === "") return new Date();
  const number = Number(value);
  if (Number.isFinite(number)) {
    const millis = number < 10_000_000_000 ? number * 1000 : number;
    const date = new Date(millis);
    if (!Number.isNaN(date.getTime())) return date;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export async function assertOutboundMailAllowed(userId: string, recipients: string[], policy: OutboundMailPolicy = "GENERAL") {
  await connectDatabase();
  const normalized = normalizeRecipients(recipients);
  if (!normalized.length) throw new AppError("MAIL_RECIPIENT_REQUIRED", 400, "Add at least one valid recipient.");

  const suppressed = await MailSuppression.find({ email: { $in: normalized }, active: true }).select({ email: 1, reason: 1 }).lean();
  if (suppressed.length) {
    const first = suppressed[0];
    throw new AppError(
      "MAIL_RECIPIENT_SUPPRESSED",
      409,
      `${String(first.email)} cannot receive mail because the address is suppressed after a ${String(first.reason).toLowerCase()} event.`
    );
  }

  const units = normalized.length;
  if (policy === "OUTREACH") {
    await enforceRateLimitUnits("mail:outreach:hour", userId, 30, HOUR, units, "Outreach sending is temporarily limited. Continue after the hourly safety window resets.");
    await enforceRateLimitUnits("mail:outreach:day", userId, 100, DAY, units, "The daily outreach safety limit has been reached. Continue after the daily window resets.");
    for (const recipient of normalized) {
      await enforceRateLimitUnits("mail:outreach:recipient-week", `${userId}:${recipient}`, 4, WEEK, 1, "This recipient has already received several recent outreach messages. Wait before contacting them again.");
    }
  } else {
    await enforceRateLimitUnits("mail:general:hour", userId, 80, HOUR, units, "Mailbox sending is temporarily limited. Continue after the hourly safety window resets.");
    await enforceRateLimitUnits("mail:general:day", userId, 300, DAY, units, "The daily mailbox safety limit has been reached. Continue after the daily window resets.");
    for (const recipient of normalized) {
      await enforceRateLimitUnits("mail:general:recipient-day", `${userId}:${recipient}`, 20, DAY, 1, "Too many messages have been sent to this recipient today.");
    }
  }
  return normalized;
}

export async function recordMailgunDeliveryFeedback(input: MailgunDeliveryFeedback) {
  await connectDatabase();
  const recipient = normalizeAddress(input.recipient);
  if (!ADDRESS_RE.test(recipient)) throw new AppError("MAILGUN_EVENT_INVALID", 400, "Mailgun delivery event recipient is invalid.");
  const type = eventType(input.event);
  const severity = eventSeverity(type, input.severity);
  const at = occurredAt(input.timestamp);
  const providerEventId = eventId(input, recipient, at);
  const detail = safeDetail(input.reason, input.description, input.severity);

  const event = await MailDeliveryEvent.findOneAndUpdate(
    { provider: "MAILGUN", providerEventId },
    {
      $setOnInsert: {
        provider: "MAILGUN",
        providerEventId,
        eventType: type,
        severity,
        recipient,
        messageId: String(input.messageId ?? "").trim().slice(0, 500) || null,
        detail,
        occurredAt: at
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  const reason = suppressionReason(type, input.severity);
  if (reason) {
    await MailSuppression.findOneAndUpdate(
      { email: recipient },
      {
        $set: {
          reason,
          source: "MAILGUN",
          active: true,
          providerEventId,
          detail: detail.slice(0, 1000),
          lastEventAt: at,
          restoredAt: null,
          restoredBy: null
        },
        $setOnInsert: { email: recipient, firstSuppressedAt: at }
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }

  return { id: String(event?._id ?? ""), eventType: type, severity, recipient, suppressed: Boolean(reason), reason };
}

export async function listDeliverabilityAdmin(limit = 100) {
  await connectDatabase();
  const capped = Math.min(200, Math.max(1, limit));
  const since = new Date(Date.now() - 24 * HOUR);
  const [suppressions, events, activeSuppressions, critical24h, failed24h, delivered24h] = await Promise.all([
    MailSuppression.find().sort({ active: -1, lastEventAt: -1 }).limit(capped).lean(),
    MailDeliveryEvent.find().sort({ occurredAt: -1 }).limit(capped).lean(),
    MailSuppression.countDocuments({ active: true }),
    MailDeliveryEvent.countDocuments({ severity: "CRITICAL", occurredAt: { $gte: since } }),
    MailDeliveryEvent.countDocuments({ eventType: "FAILED", occurredAt: { $gte: since } }),
    MailDeliveryEvent.countDocuments({ eventType: "DELIVERED", occurredAt: { $gte: since } })
  ]);
  return {
    summary: { activeSuppressions, critical24h, failed24h, delivered24h },
    suppressions: suppressions.map((row) => ({
      id: String(row._id), email: String(row.email), reason: String(row.reason), source: String(row.source), active: Boolean(row.active),
      detail: String(row.detail ?? ""), firstSuppressedAt: new Date(row.firstSuppressedAt).toISOString(), lastEventAt: new Date(row.lastEventAt).toISOString(), restoredAt: row.restoredAt ? new Date(row.restoredAt).toISOString() : null
    })),
    events: events.map((row) => ({
      id: String(row._id), provider: String(row.provider), providerEventId: String(row.providerEventId), eventType: String(row.eventType), severity: String(row.severity), recipient: String(row.recipient), messageId: row.messageId ? String(row.messageId) : null, detail: String(row.detail ?? ""), occurredAt: new Date(row.occurredAt).toISOString()
    }))
  };
}

export async function setMailSuppressionActive(actorUserId: string, suppressionId: string, active: boolean) {
  await connectDatabase();
  const row = await MailSuppression.findById(suppressionId);
  if (!row) throw new AppError("MAIL_SUPPRESSION_NOT_FOUND", 404, "Mail suppression entry not found.");
  row.active = active;
  if (!active) {
    row.restoredAt = new Date();
    row.restoredBy = actorUserId as never;
  } else {
    row.restoredAt = null;
    row.restoredBy = null;
  }
  await row.save();
  return { id: row._id.toString(), email: row.email, active: row.active };
}
