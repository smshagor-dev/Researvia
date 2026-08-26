import { createHash } from "node:crypto";
import { ImapFlow } from "imapflow";
import { prepareSystemMailboxDatabase } from "@/server/db/system-mailbox-indexes";
import { ensureSystemMailbox } from "@/server/email/system-mailbox.service";
import { AppError } from "@/server/errors/AppError";
import { enqueueJob } from "@/server/jobs/job.service";
import { SystemMailMessage } from "@/server/models/SystemMailMessage";
import { SystemMailSettings } from "@/server/models/SystemMailSettings";
import { SystemMailbox } from "@/server/models/SystemMailbox";
import { notifyUser } from "@/server/notifications/notification.service";
import { decryptSecret } from "@/server/security/crypto-box";

const MAX_BATCH = 100;
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const MAX_TEXT_CHARS = 200_000;
const MAX_HTML_CHARS = 500_000;
const ADDRESS_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig;

type ParsedMail = {
  internetMessageId: string | null;
  inReplyTo: string | null;
  references: string[];
  from: string;
  to: string[];
  cc: string[];
  replyTo: string | null;
  subject: string;
  textBody: string;
  htmlBody: string;
  headers: Record<string, string>;
};

function normalizeAddress(value: string) {
  return (value.match(ADDRESS_RE)?.[0] ?? "").trim().toLowerCase();
}

function normalizeAddressList(value: string) {
  return [...new Set((value.match(ADDRESS_RE) ?? []).map((item) => item.toLowerCase()))];
}

function unfoldHeaders(raw: string) {
  return raw.replace(/\r?\n[\t ]+/g, " ");
}

function decodeHeaderWord(value: string) {
  return value.replace(/=\?([^?]+)\?([bqBQ])\?([^?]+)\?=/g, (_match, _charset: string, mode: string, encoded: string) => {
    try {
      if (mode.toLowerCase() === "b") return Buffer.from(encoded, "base64").toString("utf8");
      const qp = encoded.replace(/_/g, " ").replace(/=([0-9A-F]{2})/gi, (_m: string, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
      return Buffer.from(qp, "binary").toString("utf8");
    } catch {
      return encoded;
    }
  });
}

function parseHeaders(raw: string) {
  const result: Record<string, string> = {};
  for (const line of unfoldHeaders(raw).split(/\r?\n/)) {
    const index = line.indexOf(":");
    if (index < 1) continue;
    const key = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    if (!key) continue;
    result[key] = result[key] ? `${result[key]}, ${value}` : value;
  }
  return result;
}

function decodeTransfer(body: string, encoding: string) {
  const normalized = encoding.toLowerCase();
  try {
    if (normalized === "base64") return Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8");
    if (normalized === "quoted-printable") {
      const joined = body.replace(/=\r?\n/g, "");
      const bytes: number[] = [];
      for (let index = 0; index < joined.length; index += 1) {
        if (joined[index] === "=" && /^[0-9A-F]{2}$/i.test(joined.slice(index + 1, index + 3))) {
          bytes.push(Number.parseInt(joined.slice(index + 1, index + 3), 16));
          index += 2;
        } else {
          bytes.push(joined.charCodeAt(index) & 0xff);
        }
      }
      return Buffer.from(bytes).toString("utf8");
    }
  } catch {
    return body;
  }
  return body;
}

function splitHeaderBody(source: string) {
  const match = source.match(/\r?\n\r?\n/);
  if (!match || match.index === undefined) return { headerText: source, body: "" };
  return { headerText: source.slice(0, match.index), body: source.slice(match.index + match[0].length) };
}

function contentBoundary(contentType: string) {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
  return match?.[1] ?? match?.[2] ?? null;
}

function extractBodies(source: string, depth = 0): { textBody: string; htmlBody: string } {
  if (depth > 3) return { textBody: "", htmlBody: "" };
  const { headerText, body } = splitHeaderBody(source);
  const headers = parseHeaders(headerText);
  const contentType = headers["content-type"] ?? "text/plain";
  const transfer = headers["content-transfer-encoding"] ?? "";
  if (/multipart\//i.test(contentType)) {
    const boundary = contentBoundary(contentType);
    if (!boundary) return { textBody: "", htmlBody: "" };
    const parts = body.split(`--${boundary}`).slice(1).filter((part) => !part.startsWith("--"));
    let textBody = "";
    let htmlBody = "";
    for (const part of parts.slice(0, 50)) {
      const extracted = extractBodies(part.replace(/^\r?\n/, ""), depth + 1);
      if (!textBody && extracted.textBody) textBody = extracted.textBody;
      if (!htmlBody && extracted.htmlBody) htmlBody = extracted.htmlBody;
      if (textBody && htmlBody) break;
    }
    return { textBody, htmlBody };
  }
  const decoded = decodeTransfer(body, transfer);
  if (/text\/html/i.test(contentType)) return { textBody: "", htmlBody: decoded.slice(0, MAX_HTML_CHARS) };
  if (/text\/plain/i.test(contentType)) return { textBody: decoded.slice(0, MAX_TEXT_CHARS), htmlBody: "" };
  return { textBody: "", htmlBody: "" };
}

function parseRawMail(buffer: Buffer): ParsedMail {
  const bounded = buffer.subarray(0, Math.min(buffer.length, MAX_SOURCE_BYTES)).toString("utf8");
  const { headerText } = splitHeaderBody(bounded);
  const headers = parseHeaders(headerText);
  const bodies = extractBodies(bounded);
  const references = (headers.references ?? "").match(/<[^>]+>/g)?.slice(-20) ?? [];
  return {
    internetMessageId: headers["message-id"]?.trim().slice(0, 500) || null,
    inReplyTo: headers["in-reply-to"]?.trim().slice(0, 500) || null,
    references,
    from: normalizeAddress(headers.from ?? "") || "unknown@example.invalid",
    to: normalizeAddressList(headers.to ?? ""),
    cc: normalizeAddressList(headers.cc ?? ""),
    replyTo: normalizeAddress(headers["reply-to"] ?? "") || null,
    subject: decodeHeaderWord(headers.subject ?? "(no subject)").replace(/[\r\n]+/g, " ").slice(0, 500),
    textBody: bodies.textBody,
    htmlBody: bodies.htmlBody,
    headers
  };
}

function accountKey(host: string, username: string) {
  return createHash("sha256").update(`${host.toLowerCase()}|${username.toLowerCase()}`).digest("hex").slice(0, 40);
}

function snippet(text: string, html: string) {
  const plain = text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return plain.trim().slice(0, 500);
}

function isDuplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

async function ingestImapMessage(input: {
  userId: string;
  accountKey: string;
  externalMailbox: string;
  uidValidity: string;
  uid: number;
  flags: string[];
  receivedAt: Date;
  source: Buffer;
}) {
  await prepareSystemMailboxDatabase();
  const mailbox = await ensureSystemMailbox(input.userId);
  const duplicate = await SystemMailMessage.findOne({
    userId: input.userId,
    source: "IMAP",
    externalAccountKey: input.accountKey,
    externalMailbox: input.externalMailbox,
    externalUidValidity: input.uidValidity,
    externalUid: input.uid
  }).lean();
  if (duplicate) return { imported: false, id: String(duplicate._id) };

  const parsed = parseRawMail(input.source);
  const internetMessageId = parsed.internetMessageId || `<imap-${input.accountKey}-${input.uidValidity}-${input.uid}@external.local>`;
  const existingByMessageId = await SystemMailMessage.findOne({ mailboxId: mailbox._id, internetMessageId }).lean();
  if (existingByMessageId) return { imported: false, id: String(existingByMessageId._id) };

  const parent = parsed.inReplyTo
    ? await SystemMailMessage.findOne({ userId: input.userId, internetMessageId: parsed.inReplyTo }).lean()
    : parsed.references.length
      ? await SystemMailMessage.findOne({ userId: input.userId, internetMessageId: { $in: parsed.references } }).sort({ createdAt: -1 }).lean()
      : null;
  const threadKey = parent?.threadKey || internetMessageId;
  const readAt = input.flags.some((flag) => flag.toLowerCase() === "\\seen") ? input.receivedAt : null;

  try {
    const message = await SystemMailMessage.create({
      userId: input.userId,
      mailboxId: mailbox._id,
      internetMessageId,
      providerMessageId: `imap:${input.accountKey}:${input.uidValidity}:${input.uid}`,
      source: "IMAP",
      externalAccountKey: input.accountKey,
      externalMailbox: input.externalMailbox,
      externalUidValidity: input.uidValidity,
      externalUid: input.uid,
      externalFlags: input.flags.slice(0, 50),
      threadKey,
      inReplyTo: parsed.inReplyTo,
      references: parsed.references,
      direction: "INBOUND",
      folder: "INBOX",
      from: parsed.from,
      to: parsed.to,
      cc: parsed.cc,
      replyTo: parsed.replyTo,
      subject: parsed.subject,
      textBody: parsed.textBody,
      htmlBody: parsed.htmlBody,
      snippet: snippet(parsed.textBody, parsed.htmlBody),
      attachments: [],
      readAt,
      receivedAt: input.receivedAt,
      rawHeaders: { ...parsed.headers, "x-researvia-source": "IMAP", "x-researvia-external-mailbox": input.externalMailbox }
    });
    await SystemMailbox.updateOne({ _id: mailbox._id }, { $set: { lastReceivedAt: new Date() } });

    const settings = await SystemMailSettings.findOne({ userId: input.userId }).lean();
    if (settings?.webNotifications !== false || settings?.pushNotifications !== false) {
      const notification = await notifyUser({
        userId: input.userId,
        type: "SYSTEM_MAIL",
        title: `New email: ${parsed.subject || "(no subject)"}`,
        message: `${parsed.from} — ${snippet(parsed.textBody, parsed.htmlBody).slice(0, 220)}`,
        href: `/dashboard/mail?message=${String(message._id)}`,
        dedupeKey: `system-mail:${String(message._id)}`,
        metadata: { messageId: String(message._id), from: parsed.from, subject: parsed.subject, source: "IMAP" }
      });
      if (settings?.pushNotifications !== false) {
        await enqueueJob({
          type: "SEND_PUSH_NOTIFICATION",
          payload: { notificationId: String(notification._id) },
          idempotencyKey: `push-notification:${String(notification._id)}`,
          maxAttempts: 5
        });
      }
    }
    return { imported: true, id: String(message._id) };
  } catch (error) {
    if (isDuplicateKey(error)) return { imported: false, id: null };
    throw error;
  }
}

export async function syncSystemImap(userId: string, options: { force?: boolean } = {}) {
  await prepareSystemMailboxDatabase();
  const row = await SystemMailSettings.findOne({ userId }).select("+imapPasswordEnc");
  if (!row) throw new AppError("MAIL_IMAP_NOT_CONFIGURED", 400, "Configure IMAP before synchronizing mail.");
  if (!options.force && !row.imapSyncEnabled) return { skipped: true, imported: 0, reason: "disabled" };
  if (!row.imapHost || !row.imapUsername || !row.imapPasswordEnc) {
    throw new AppError("MAIL_IMAP_NOT_CONFIGURED", 400, "Enter IMAP host, username, and password before synchronizing mail.");
  }

  const externalMailbox = row.imapMailbox || "INBOX";
  const key = accountKey(row.imapHost, row.imapUsername);
  const client = new ImapFlow({
    host: row.imapHost,
    port: row.imapPort,
    secure: row.imapSecure,
    auth: { user: row.imapUsername, pass: decryptSecret(row.imapPasswordEnc) },
    logger: false
  });
  await SystemMailSettings.updateOne({ _id: row._id }, { $set: { imapSyncStatus: "RUNNING", imapSyncStartedAt: new Date(), lastConfigError: null } });

  try {
    await client.connect();
    const opened = await client.mailboxOpen(externalMailbox, { readOnly: true });
    const uidValidity = String(opened.uidValidity ?? "0");
    const uidNext = Math.max(1, Number(opened.uidNext ?? 1));
    const cursorValid = row.imapUidValidity === uidValidity;
    const lastUid = cursorValid ? Number(row.imapLastUid ?? 0) : 0;
    const startUid = lastUid > 0 ? lastUid + 1 : Math.max(1, uidNext - MAX_BATCH);

    let imported = 0;
    let scanned = 0;
    let maxUid = lastUid;
    if (startUid < uidNext) {
      for await (const message of client.fetch(`${startUid}:*`, { uid: true, flags: true, internalDate: true, source: true }, { uid: true })) {
        if (scanned >= MAX_BATCH) break;
        const uid = Number(message.uid ?? 0);
        if (!uid || uid >= uidNext) continue;
        scanned += 1;
        maxUid = Math.max(maxUid, uid);
        const source = Buffer.isBuffer(message.source) ? message.source : Buffer.from(message.source ?? "");
        const result = await ingestImapMessage({
          userId,
          accountKey: key,
          externalMailbox,
          uidValidity,
          uid,
          flags: [...(message.flags ?? [])].map(String),
          receivedAt: message.internalDate ? new Date(message.internalDate) : new Date(),
          source
        });
        if (result.imported) imported += 1;
      }
    }

    const now = new Date();
    await SystemMailSettings.updateOne({ _id: row._id }, {
      $set: {
        imapUidValidity: uidValidity,
        imapLastUid: maxUid,
        imapSyncStatus: "IDLE",
        imapSyncStartedAt: null,
        imapLastImportedCount: imported,
        lastImapSyncAt: now,
        lastConfigError: null
      }
    });
    return { skipped: false, imported, scanned, lastUid: maxUid, syncedAt: now.toISOString() };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "IMAP synchronization failed.";
    await SystemMailSettings.updateOne({ _id: row._id }, { $set: { imapSyncStatus: "ERROR", imapSyncStartedAt: null, lastConfigError: message } });
    if (error instanceof AppError) throw error;
    throw new AppError("MAIL_IMAP_SYNC_FAILED", 502, "IMAP synchronization failed. Check the mailbox settings and try again.");
  } finally {
    try { await client.logout(); } catch { /* connection can fail before authentication */ }
  }
}

function hourlyKey(date = new Date()) {
  return date.toISOString().slice(0, 13);
}

export async function enqueueEnabledSystemImapSyncs(reason = "periodic-reconciliation") {
  await prepareSystemMailboxDatabase();
  const rows = await SystemMailSettings.find({
    imapSyncEnabled: true,
    imapHost: { $ne: "" },
    imapUsername: { $ne: "" }
  }).select({ userId: 1 }).limit(500).lean();
  let queued = 0;
  for (const row of rows) {
    const userId = String(row.userId);
    await enqueueJob({
      type: "SYNC_SYSTEM_IMAP",
      payload: { userId, reason },
      idempotencyKey: `system-imap:${userId}:${hourlyKey()}`,
      maxAttempts: 3
    });
    queued += 1;
  }
  return { queued };
}
