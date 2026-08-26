import { ImapFlow } from "imapflow";
import { prepareSystemMailboxDatabase } from "@/server/db/system-mailbox-indexes";
import { AppError } from "@/server/errors/AppError";
import { verifySystemMailboxSmtpTransport, type SystemMailboxSmtpTransport } from "@/server/email/mailer";
import { SystemMailSettings } from "@/server/models/SystemMailSettings";
import { decryptSecret, encryptSecret } from "@/server/security/crypto-box";

const ADDRESS_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;

export type SystemMailSettingsUpdate = {
  deliveryMode?: "MANAGED" | "CUSTOM";
  senderName?: string;
  signature?: string;
  replyTo?: string;
  forwardingEnabled?: boolean;
  forwardingEmail?: string;
  webNotifications?: boolean;
  pushNotifications?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUsername?: string;
  smtpPassword?: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  imapUsername?: string;
  imapPassword?: string;
};

async function ensureRow(userId: string) {
  await prepareSystemMailboxDatabase();
  const row = await SystemMailSettings.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  if (!row) throw new AppError("MAIL_SETTINGS_UNAVAILABLE", 500, "Mailbox settings could not be loaded.");
  return row;
}

function safeDto(row: Record<string, unknown>) {
  return {
    deliveryMode: row.deliveryMode === "CUSTOM" ? "CUSTOM" : "MANAGED",
    senderName: String(row.senderName ?? ""),
    signature: String(row.signature ?? ""),
    replyTo: String(row.replyTo ?? ""),
    forwardingEnabled: Boolean(row.forwardingEnabled),
    forwardingEmail: String(row.forwardingEmail ?? ""),
    webNotifications: row.webNotifications !== false,
    pushNotifications: row.pushNotifications !== false,
    smtpHost: String(row.smtpHost ?? ""),
    smtpPort: Number(row.smtpPort ?? 587),
    smtpSecure: Boolean(row.smtpSecure),
    smtpUsername: String(row.smtpUsername ?? ""),
    smtpPasswordSaved: Boolean(row.smtpPasswordEnc),
    imapHost: String(row.imapHost ?? ""),
    imapPort: Number(row.imapPort ?? 993),
    imapSecure: row.imapSecure !== false,
    imapUsername: String(row.imapUsername ?? ""),
    imapPasswordSaved: Boolean(row.imapPasswordEnc),
    lastSmtpTestAt: row.lastSmtpTestAt ? new Date(row.lastSmtpTestAt as Date).toISOString() : null,
    lastImapTestAt: row.lastImapTestAt ? new Date(row.lastImapTestAt as Date).toISOString() : null,
    lastImapSyncAt: row.lastImapSyncAt ? new Date(row.lastImapSyncAt as Date).toISOString() : null,
    lastConfigError: row.lastConfigError ? String(row.lastConfigError) : null
  };
}

function validateAddress(value: string, field: string) {
  if (value && !ADDRESS_RE.test(value)) throw new AppError("MAIL_SETTINGS_INVALID", 400, `${field} must be a valid email address.`);
}

export async function getSystemMailSettings(userId: string) {
  const row = await SystemMailSettings.findOne({ userId }).select("+smtpPasswordEnc +imapPasswordEnc").lean() ?? await ensureRow(userId);
  return safeDto(row as unknown as Record<string, unknown>);
}

export async function updateSystemMailSettings(userId: string, input: SystemMailSettingsUpdate) {
  await prepareSystemMailboxDatabase();
  validateAddress(input.replyTo?.trim().toLowerCase() ?? "", "Reply-to");
  validateAddress(input.forwardingEmail?.trim().toLowerCase() ?? "", "Forwarding email");

  const set: Record<string, unknown> = {};
  if (input.deliveryMode) set.deliveryMode = input.deliveryMode;
  if (typeof input.senderName === "string") set.senderName = input.senderName.trim().slice(0, 120);
  if (typeof input.signature === "string") set.signature = input.signature.slice(0, 4000);
  if (typeof input.replyTo === "string") set.replyTo = input.replyTo.trim().toLowerCase();
  if (typeof input.forwardingEnabled === "boolean") set.forwardingEnabled = input.forwardingEnabled;
  if (typeof input.forwardingEmail === "string") set.forwardingEmail = input.forwardingEmail.trim().toLowerCase();
  if (typeof input.webNotifications === "boolean") set.webNotifications = input.webNotifications;
  if (typeof input.pushNotifications === "boolean") set.pushNotifications = input.pushNotifications;
  if (typeof input.smtpHost === "string") set.smtpHost = input.smtpHost.trim();
  if (typeof input.smtpPort === "number") set.smtpPort = input.smtpPort;
  if (typeof input.smtpSecure === "boolean") set.smtpSecure = input.smtpSecure;
  if (typeof input.smtpUsername === "string") set.smtpUsername = input.smtpUsername.trim();
  if (typeof input.smtpPassword === "string" && input.smtpPassword.length > 0) set.smtpPasswordEnc = encryptSecret(input.smtpPassword);
  if (typeof input.imapHost === "string") set.imapHost = input.imapHost.trim();
  if (typeof input.imapPort === "number") set.imapPort = input.imapPort;
  if (typeof input.imapSecure === "boolean") set.imapSecure = input.imapSecure;
  if (typeof input.imapUsername === "string") set.imapUsername = input.imapUsername.trim();
  if (typeof input.imapPassword === "string" && input.imapPassword.length > 0) set.imapPasswordEnc = encryptSecret(input.imapPassword);
  set.lastConfigError = null;

  await SystemMailSettings.findOneAndUpdate(
    { userId },
    { $set: set, $setOnInsert: { userId } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  return getSystemMailSettings(userId);
}

async function secretRow(userId: string) {
  await prepareSystemMailboxDatabase();
  const row = await SystemMailSettings.findOne({ userId }).select("+smtpPasswordEnc +imapPasswordEnc");
  if (!row) throw new AppError("MAIL_SETTINGS_UNAVAILABLE", 404, "Mailbox settings were not found.");
  return row;
}

export async function getSystemMailDeliveryProfile(userId: string): Promise<{
  senderName: string;
  signature: string;
  replyTo: string | null;
  transport: SystemMailboxSmtpTransport | null;
}> {
  const row = await secretRow(userId);
  if (row.deliveryMode !== "CUSTOM") {
    return { senderName: row.senderName || "", signature: row.signature || "", replyTo: row.replyTo || null, transport: null };
  }
  if (!row.smtpHost || !row.smtpUsername || !row.smtpPasswordEnc) {
    throw new AppError("MAIL_SMTP_NOT_CONFIGURED", 400, "Complete and test your custom SMTP settings before sending.");
  }
  return {
    senderName: row.senderName || "",
    signature: row.signature || "",
    replyTo: row.replyTo || null,
    transport: {
      host: row.smtpHost,
      port: row.smtpPort,
      secure: row.smtpSecure,
      username: row.smtpUsername,
      password: decryptSecret(row.smtpPasswordEnc)
    }
  };
}

export async function getSystemMailInboundPreferences(userId: string) {
  const row = await ensureRow(userId);
  return {
    forwardingEnabled: Boolean(row.forwardingEnabled && row.forwardingEmail),
    forwardingEmail: String(row.forwardingEmail ?? ""),
    webNotifications: row.webNotifications !== false,
    pushNotifications: row.pushNotifications !== false
  };
}

export async function testSystemMailSmtp(userId: string) {
  const row = await secretRow(userId);
  if (!row.smtpHost || !row.smtpUsername || !row.smtpPasswordEnc) {
    throw new AppError("MAIL_SMTP_NOT_CONFIGURED", 400, "Enter SMTP host, username, and password first.");
  }
  try {
    await verifySystemMailboxSmtpTransport({
      host: row.smtpHost,
      port: row.smtpPort,
      secure: row.smtpSecure,
      username: row.smtpUsername,
      password: decryptSecret(row.smtpPasswordEnc)
    });
    const now = new Date();
    await SystemMailSettings.updateOne({ _id: row._id }, { $set: { lastSmtpTestAt: now, lastConfigError: null } });
    return { ok: true, testedAt: now.toISOString() };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "SMTP connection failed.";
    await SystemMailSettings.updateOne({ _id: row._id }, { $set: { lastConfigError: message } });
    throw new AppError("MAIL_SMTP_TEST_FAILED", 400, "SMTP connection failed. Check the server, port, encryption, username, and app password.");
  }
}

export async function testSystemMailImap(userId: string) {
  const row = await secretRow(userId);
  if (!row.imapHost || !row.imapUsername || !row.imapPasswordEnc) {
    throw new AppError("MAIL_IMAP_NOT_CONFIGURED", 400, "Enter IMAP host, username, and password first.");
  }
  const client = new ImapFlow({
    host: row.imapHost,
    port: row.imapPort,
    secure: row.imapSecure,
    auth: { user: row.imapUsername, pass: decryptSecret(row.imapPasswordEnc) },
    logger: false
  });
  try {
    await client.connect();
    await client.mailboxOpen("INBOX", { readOnly: true });
    const now = new Date();
    await SystemMailSettings.updateOne({ _id: row._id }, { $set: { lastImapTestAt: now, lastConfigError: null } });
    return { ok: true, testedAt: now.toISOString() };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "IMAP connection failed.";
    await SystemMailSettings.updateOne({ _id: row._id }, { $set: { lastConfigError: message } });
    throw new AppError("MAIL_IMAP_TEST_FAILED", 400, "IMAP connection failed. Check the server, port, encryption, username, and app password.");
  } finally {
    try { await client.logout(); } catch { /* connection may have failed before login */ }
  }
}
