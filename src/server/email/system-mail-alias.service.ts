import mongoose from "mongoose";
import { getServerEnv } from "@/config/env";
import { prepareSystemMailboxDatabase } from "@/server/db/system-mailbox-indexes";
import { AppError } from "@/server/errors/AppError";
import { SystemMailAlias } from "@/server/models/SystemMailAlias";
import { SystemMailSettings } from "@/server/models/SystemMailSettings";
import { SystemMailbox } from "@/server/models/SystemMailbox";

const ADDRESS_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;
const LOCAL_PART_RE = /^[a-z0-9](?:[a-z0-9._-]{1,38}[a-z0-9])?$/;
const MAX_ALIASES = 5;
const RESERVED = new Set([
  "abuse", "admin", "administrator", "contact", "help", "hostmaster", "info", "mail", "mailer-daemon",
  "no-reply", "noreply", "postmaster", "privacy", "root", "security", "support", "webmaster"
]);

function domain() {
  const value = getServerEnv().SYSTEM_MAIL_DOMAIN?.trim().toLowerCase();
  if (!value) throw new AppError("SYSTEM_MAIL_NOT_CONFIGURED", 503, "System mailbox domain is not configured.");
  return value;
}

function normalizeAddress(value: string) {
  const angle = value.match(/<([^<>\s]+@[^<>\s]+)>/);
  const plain = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return (angle?.[1] ?? plain?.[0] ?? value).trim().toLowerCase();
}

function validateReplyTo(value: string) {
  const normalized = normalizeAddress(value);
  if (value.trim() && !ADDRESS_RE.test(normalized)) throw new AppError("MAIL_ALIAS_INVALID", 400, "Reply-to must be a valid email address.");
  return value.trim() ? normalized : "";
}

function validateLocalPart(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 40 || !LOCAL_PART_RE.test(normalized)) {
    throw new AppError("MAIL_ALIAS_INVALID", 400, "Alias must be 3–40 lowercase letters, numbers, dots, underscores or hyphens, and start/end with a letter or number.");
  }
  if (RESERVED.has(normalized)) throw new AppError("MAIL_ALIAS_RESERVED", 409, "This mailbox alias is reserved for system operations.");
  return normalized;
}

async function mailboxForUser(userId: string) {
  await prepareSystemMailboxDatabase();
  const mailbox = await SystemMailbox.findOne({ userId, status: "ACTIVE" }).lean();
  if (!mailbox) throw new AppError("MAILBOX_UNAVAILABLE", 404, "Create or activate your system mailbox before managing aliases.");
  return mailbox;
}

function aliasDto(alias: Record<string, unknown>, fallbackName: string, fallbackReplyTo: string) {
  return {
    id: String(alias._id),
    address: String(alias.address),
    localPart: String(alias.localPart),
    label: String(alias.label ?? ""),
    displayName: String(alias.displayName ?? "") || fallbackName,
    replyTo: String(alias.replyTo ?? "") || fallbackReplyTo,
    status: String(alias.status),
    isDefault: Boolean(alias.isDefault),
    isPrimary: false,
    lastReceivedAt: alias.lastReceivedAt ? new Date(alias.lastReceivedAt as Date).toISOString() : null,
    lastSentAt: alias.lastSentAt ? new Date(alias.lastSentAt as Date).toISOString() : null
  };
}

export async function listSystemMailSenderIdentities(userId: string) {
  const mailbox = await mailboxForUser(userId);
  const [settings, aliases] = await Promise.all([
    SystemMailSettings.findOne({ userId }).lean(),
    SystemMailAlias.find({ userId, mailboxId: mailbox._id }).sort({ isDefault: -1, createdAt: 1 }).lean()
  ]);
  const fallbackName = String(settings?.senderName || mailbox.displayName || "");
  const fallbackReplyTo = String(settings?.replyTo || "");
  const activeDefault = aliases.some((alias) => alias.status === "ACTIVE" && alias.isDefault);
  return [
    {
      id: "primary",
      address: String(mailbox.address),
      localPart: String(mailbox.localPart),
      label: "Primary mailbox",
      displayName: fallbackName,
      replyTo: fallbackReplyTo,
      status: String(mailbox.status),
      isDefault: !activeDefault,
      isPrimary: true,
      lastReceivedAt: mailbox.lastReceivedAt ? new Date(mailbox.lastReceivedAt).toISOString() : null,
      lastSentAt: mailbox.lastSentAt ? new Date(mailbox.lastSentAt).toISOString() : null
    },
    ...aliases.map((alias) => aliasDto(alias as unknown as Record<string, unknown>, fallbackName, fallbackReplyTo))
  ];
}

export async function resolveSystemMailSender(userId: string, requestedAddress?: string | null) {
  const mailbox = await mailboxForUser(userId);
  const settings = await SystemMailSettings.findOne({ userId }).lean();
  const fallbackName = String(settings?.senderName || mailbox.displayName || "");
  const fallbackReplyTo = String(settings?.replyTo || "");
  const requested = requestedAddress ? normalizeAddress(requestedAddress) : "";

  if (requested) {
    if (requested === String(mailbox.address).toLowerCase()) {
      return { address: String(mailbox.address), displayName: fallbackName, replyTo: fallbackReplyTo || null, aliasId: null, isPrimary: true };
    }
    const alias = await SystemMailAlias.findOne({ userId, mailboxId: mailbox._id, address: requested, status: "ACTIVE" }).lean();
    if (!alias) throw new AppError("MAIL_SENDER_IDENTITY_UNAVAILABLE", 409, "The selected sender identity is unavailable or disabled.");
    return {
      address: String(alias.address),
      displayName: String(alias.displayName || fallbackName),
      replyTo: String(alias.replyTo || fallbackReplyTo) || null,
      aliasId: String(alias._id),
      isPrimary: false
    };
  }

  const alias = await SystemMailAlias.findOne({ userId, mailboxId: mailbox._id, status: "ACTIVE", isDefault: true }).lean();
  if (!alias) return { address: String(mailbox.address), displayName: fallbackName, replyTo: fallbackReplyTo || null, aliasId: null, isPrimary: true };
  return {
    address: String(alias.address),
    displayName: String(alias.displayName || fallbackName),
    replyTo: String(alias.replyTo || fallbackReplyTo) || null,
    aliasId: String(alias._id),
    isPrimary: false
  };
}

export async function resolveSystemMailRecipient(address: string) {
  await prepareSystemMailboxDatabase();
  const normalized = normalizeAddress(address);
  const mailbox = await SystemMailbox.findOne({ address: normalized, status: "ACTIVE" }).lean();
  if (mailbox) return { mailbox, alias: null, recipientAddress: normalized };
  const alias = await SystemMailAlias.findOne({ address: normalized, status: "ACTIVE" }).lean();
  if (!alias) return null;
  const ownerMailbox = await SystemMailbox.findOne({ _id: alias.mailboxId, userId: alias.userId, status: "ACTIVE" }).lean();
  if (!ownerMailbox) return null;
  return { mailbox: ownerMailbox, alias, recipientAddress: normalized };
}

export async function createSystemMailAlias(userId: string, input: { localPart: string; label?: string; displayName?: string; replyTo?: string; isDefault?: boolean }) {
  const mailbox = await mailboxForUser(userId);
  const count = await SystemMailAlias.countDocuments({ userId, mailboxId: mailbox._id });
  if (count >= MAX_ALIASES) throw new AppError("MAIL_ALIAS_LIMIT", 409, `A mailbox can reserve at most ${MAX_ALIASES} aliases.`);
  const localPart = validateLocalPart(input.localPart);
  const address = `${localPart}@${domain()}`;
  const collision = await Promise.all([
    SystemMailbox.exists({ address }),
    SystemMailAlias.exists({ address })
  ]);
  if (collision.some(Boolean)) throw new AppError("MAIL_ALIAS_TAKEN", 409, "This mailbox alias is already reserved.");
  if (input.isDefault) await SystemMailAlias.updateMany({ userId, mailboxId: mailbox._id, isDefault: true }, { $set: { isDefault: false } });
  try {
    const alias = await SystemMailAlias.create({
      userId,
      mailboxId: mailbox._id,
      localPart,
      address,
      label: input.label?.trim().slice(0, 80) ?? "",
      displayName: input.displayName?.trim().slice(0, 120) ?? "",
      replyTo: validateReplyTo(input.replyTo ?? ""),
      status: "ACTIVE",
      isDefault: Boolean(input.isDefault)
    });
    return alias.toObject();
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000) {
      throw new AppError("MAIL_ALIAS_TAKEN", 409, "This mailbox alias is already reserved.");
    }
    throw error;
  }
}

export async function updateSystemMailAlias(userId: string, aliasId: string, input: { label?: string; displayName?: string; replyTo?: string; status?: "ACTIVE" | "DISABLED"; isDefault?: boolean }) {
  if (!mongoose.isValidObjectId(aliasId)) throw new AppError("MAIL_ALIAS_NOT_FOUND", 404, "Mailbox alias not found.");
  const mailbox = await mailboxForUser(userId);
  const alias = await SystemMailAlias.findOne({ _id: aliasId, userId, mailboxId: mailbox._id });
  if (!alias) throw new AppError("MAIL_ALIAS_NOT_FOUND", 404, "Mailbox alias not found.");

  if (typeof input.label === "string") alias.label = input.label.trim().slice(0, 80);
  if (typeof input.displayName === "string") alias.displayName = input.displayName.trim().slice(0, 120);
  if (typeof input.replyTo === "string") alias.replyTo = validateReplyTo(input.replyTo);
  if (input.status) {
    alias.status = input.status;
    if (input.status === "DISABLED") alias.isDefault = false;
  }
  if (typeof input.isDefault === "boolean") {
    if (input.isDefault && alias.status !== "ACTIVE") throw new AppError("MAIL_ALIAS_DISABLED", 409, "Enable this alias before making it the default sender.");
    if (input.isDefault) await SystemMailAlias.updateMany({ userId, mailboxId: mailbox._id, _id: { $ne: alias._id }, isDefault: true }, { $set: { isDefault: false } });
    alias.isDefault = input.isDefault;
  }
  await alias.save();
  return alias.toObject();
}

export async function touchSystemMailAlias(aliasId: string | null | undefined, field: "lastReceivedAt" | "lastSentAt", at = new Date()) {
  if (!aliasId || !mongoose.isValidObjectId(aliasId)) return;
  await SystemMailAlias.updateOne({ _id: aliasId }, { $set: { [field]: at } });
}
