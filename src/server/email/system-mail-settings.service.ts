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
  imapSyncEnabled?: boolean;
  imapMailbox?: string;
};

export type SystemMailSettingsDto = {
  deliveryMode: "MANAGED" | "CUSTOM";
  senderName: string;
  signature: string;
  replyTo: string;
  forwardingEnabled: boolean;
  forwardingEmail: string;
  webNotifications: boolean;
  pushNotifications: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
  smtpPasswordSaved: boolean;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUsername: string;
  imapPasswordSaved: boolean;
  imapSyncEnabled: boolean;
  imapMailbox: string;
  imapLastUid: number;
  imapSyncStatus: "IDLE" | "RUNNING" | "ERROR";
  imapLastImportedCount: number;
  lastSmtpTestAt: string | null;
  lastImapTestAt: string | null;
  lastImapSyncAt: string | null;
  lastConfigError: string | null;
};

async function ensureRow(userId: string) {
  await prepareSystemMailboxDatabase();
  const row = await SystemMailSettings.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  ).lean();
  if (!row) throw new AppError("MAIL_SETTINGS_UNAVAILABLE", 500, "Mailbox settings could not be loaded.");
  return row;
}

function asDate(value: unknown) {
  return value ? new Date(value as Date).toISOString() : null;
}

function safeDto(row: Record<string, unknown>): SystemMailSettingsDto {
  const syncStatus = row.imapSyncStatus === "RUNNING" || row.imapSyncStatus === "ERROR" ? row.imapSyncStatus : "IDLE";
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
    imapSyncEnabled: Boolean(row.imapSyncEnabled),
    imapMailbox: String(row.imapMailbox ?? "INBOX"),
    imapLastUid: Number(row.imapLastUid ?? 0),
    imapSyncStatus: syncStatus,
    imapLastImportedCount: Number(row.imapLastImportedCount ?? 0),
    lastSmtpTestAt: asDate(row.lastSmtpTestAt),
    lastImapTestAt: asDate(row.lastImapTestAt),
    lastImapSyncAt: asDate(row.lastImapSyncAt),
    lastConfigError: row.lastConfigError ? String(row.lastConfigError) : null
  };
}

function validateAddress(value: string, field: string) {
  if (value && !ADDRESS_RE.test(value)) throw new AppError("MAIL_SETTINGS_INVALID", 400, `${field} must be a valid email address.`);
}

function validateMailbox(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 255 || /[\0\r\n]/.test(trimmed)) {
    throw new AppError("MAIL_SETTINGS_INVALID", 400, "IMAP mailbox name is invalid.");
  }
  return trimmed;
}

export async function getSystemMailSettings(userId: string): Promise<SystemMailSettingsDto> {
  await prepareSystemMailboxDatabase();
  const row = await SystemMailSettings.findOne({ userId }).select("+smtpPasswordEnc +imapPasswordEnc").lean() ?? await ensureRow(userId);
  return safeDto(row as unknown as Record<string, unknown>);
}

export async function updateSystemMailSettings(userId: string, input: SystemMailSettingsUpdate) {
  await prepareSystemMailboxDatabase();
  validateAddress(input.replyTo?.trim().toLowerCase() ?? "", "Reply-to");
  validateAddress(input.forwardingEmail?.trim().toLowerCase() ?? "", "Forwarding email");

  const current = await SystemMailSettings.findOne({ userId }).select("+imapPasswordEnc").lean();
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

  const nextImapHost = typeof input.imapHost === "string" ? input.imapHost.trim() : String(current?.imapHost ?? "");
  const nextImapUsername = typeof input.imapUsername === "string" ? input.imapUsername.trim() : String(current?.imapUsername ?? "");
  const nextImapMailbox = typeof input.imapMailbox === "string" ? validateMailbox(input.imapMailbox) : String(current?.imapMailbox ?? "INBOX");
  const imapIdentityChanged = Boolean(current) && (
    nextImapHost !== String(current?.imapHost ?? "") ||
    nextImapUsername !== String(current?.imapUsername ?? "") ||
    nextImapMailbox !== String(current?.imapMailbox ?? "INBOX")
  );
  if (typeof input.imapHost === "string") set.imapHost = nextImapHost;
  if (typeof input.imapPort === "number") set.imapPort = input.imapPort;
  if (typeof input.imapSecure === "boolean") set.imapSecure = input.imapSecure;
  if (typeof input.imapUsername === "string") set.imapUsername = nextImapUsername;
  if (typeof input.imapMailbox === "string") set.imapMailbox = nextImapMailbox;
  if (typeof input.imapPassword === "string" && input.imapPassword.length > 0) set.imapPasswordEnc = encryptSecret(input.imapPassword);
  if (typeof input.imapSyncEnabled === "boolean") {
    if (input.imapSyncEnabled) {
      const passwordSaved = Boolean(current?.imapPasswordEnc || (typeof input.imapPassword === "string" && input.imapPassword.length > 0));
      if (!nextImapHost || !nextImapUsername || !passwordSaved) {
        throw new AppError("MAIL_IMAP_NOT_CONFIGURED", 400, "Save an IMAP host, username, and password before enabling synchronization.");
      }
    }
    set.imapSyncEnabled = input.imapSyncEnabled;
  }
  if (imapIdentityChanged) {
    set.imapUidValidity = null;
    set.imapLastUid = 0;
    set.lastImapSyncAt = null;
    set.imapLastImportedCount = 0;
    set.imapSyncStatus = "IDLE";
  }
  set.lastConfigError = null;

  await SystemMailSettings.findOneAndUpdate(
    { userId },
    { $set: set, $setOnInsert: { userId } },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
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
  if (row.deliveryMode !== "CUSTOM") return { senderName: row.senderName || "", signature: row.signature || "", replyTo: row.replyTo || null, transport: null };
  if (!row.smtpHost || !row.smtpUsername || !row.smtpPasswordEnc) {
    throw new AppError("MAIL_SMTP_NOT_CONFIGURED", 400, "Complete and test your custom SMTP settings before sending.");
  }
  return {
    senderName: row.senderName || "",
    signature: row.signature || "",
    replyTo: row.replyTo || null,
    transport: { host: row.smtpHost, port: row.smtpPort, secure: row.smtpSecure, username: row.smtpUsername, password: decryptSecret(row.smtpPasswordEnc) }
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
  if (!row.smtpHost || !row.smtpUsername || !row.smtpPasswordEnc) throw new AppError("MAIL_SMTP_NOT_CONFIGURED", 400, "Enter SMTP host, username, and password first.");
  try {
    await verifySystemMailboxSmtpTransport({ host: row.smtpHost, port: row.smtpPort, secure: row.smtpSecure, username: row.smtpUsername, password: decryptSecret(row.smtpPasswordEnc) });
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
  if (!row.imapHost || !row.imapUsername || !row.imapPasswordEnc) throw new AppError("MAIL_IMAP_NOT_CONFIGURED", 400, "Enter IMAP host, username, and password first.");
  const client = new ImapFlow({ host: row.imapHost, port: row.imapPort, secure: row.imapSecure, auth: { user: row.imapUsername, pass: decryptSecret(row.imapPasswordEnc) }, logger: false });
  try {
    await client.connect();
    await client.mailboxOpen(row.imapMailbox || "INBOX", { readOnly: true });
    const now = new Date();
    await SystemMailSettings.updateOne({ _id: row._id }, { $set: { lastImapTestAt: now, lastConfigError: null } });
    return { ok: true, testedAt: now.toISOString() };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "IMAP connection failed.";
    await SystemMailSettings.updateOne({ _id: row._id }, { $set: { lastConfigError: message } });
    throw new AppError("MAIL_IMAP_TEST_FAILED", 400, "IMAP connection failed. Check the server, port, encryption, username, mailbox, and app password.");
  } finally {
    try { await client.logout(); } catch { /* connection may have failed before login */ }
  }
}
