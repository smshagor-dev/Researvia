import nodemailer, { type Transporter } from "nodemailer";
import { getServerEnv } from "@/config/env";
import { prepareSystemMailboxDatabase } from "@/server/db/system-mailbox-indexes";
import { assertOutboundMailAllowed } from "@/server/email/deliverability.service";
import { AppError } from "@/server/errors/AppError";
import { SystemMailAlias } from "@/server/models/SystemMailAlias";
import { SystemMailbox } from "@/server/models/SystemMailbox";
import { SystemMailSettings } from "@/server/models/SystemMailSettings";
import { decryptSecret } from "@/server/security/crypto-box";

export type SystemMailboxSmtpTransport = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
};

let transporter: Transporter | null = null;

function assertSmtpTransportReady(): void {
  const env = getServerEnv();
  if (!env.SMTP_HOST) {
    throw new AppError("EMAIL_SERVICE_UNAVAILABLE", 503, "Email delivery is not configured yet. Please try again later.");
  }
  if ((env.SMTP_USER && !env.SMTP_PASSWORD) || (!env.SMTP_USER && env.SMTP_PASSWORD)) {
    throw new AppError("EMAIL_SERVICE_UNAVAILABLE", 503, "Email delivery is not configured correctly.");
  }
}

export function assertEmailReady(): void {
  assertSmtpTransportReady();
  if (!getServerEnv().SMTP_FROM) {
    throw new AppError("EMAIL_SERVICE_UNAVAILABLE", 503, "Transactional email sender is not configured yet.");
  }
}

function getTransporter(): Transporter {
  assertSmtpTransportReady();
  if (transporter) return transporter;

  const env = getServerEnv();
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined
  });

  return transporter;
}

function customTransporter(config: SystemMailboxSmtpTransport): Transporter {
  if (!config.host || !config.username || !config.password) {
    throw new AppError("MAIL_SMTP_NOT_CONFIGURED", 400, "Complete your SMTP settings before using custom delivery.");
  }
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.username, pass: config.password },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000
  });
}

export async function verifySystemMailboxSmtpTransport(config: SystemMailboxSmtpTransport) {
  const client = customTransporter(config);
  await client.verify();
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  assertEmailReady();
  const env = getServerEnv();
  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html
  });
}

async function resolveUserMailboxDelivery(fromAddress: string) {
  await prepareSystemMailboxDatabase();
  const address = fromAddress.trim().toLowerCase();
  let mailbox = await SystemMailbox.findOne({ address, status: "ACTIVE" }).select("userId displayName").lean();
  let alias: Awaited<ReturnType<typeof SystemMailAlias.findOne>> | null = null;
  if (!mailbox) {
    alias = await SystemMailAlias.findOne({ address, status: "ACTIVE" }).lean();
    if (alias) mailbox = await SystemMailbox.findOne({ _id: alias.mailboxId, userId: alias.userId, status: "ACTIVE" }).select("userId displayName").lean();
  }
  if (!mailbox) return null;
  const settings = await SystemMailSettings.findOne({ userId: mailbox.userId }).select("+smtpPasswordEnc").lean();
  const aliasName = alias ? String(alias.displayName || "") : "";
  const aliasReplyTo = alias ? String(alias.replyTo || "") : "";
  if (!settings) return { userId: String(mailbox.userId), fromName: aliasName || mailbox.displayName || "", replyTo: aliasReplyTo || null as string | null, signature: "", transport: null as SystemMailboxSmtpTransport | null };

  let transport: SystemMailboxSmtpTransport | null = null;
  if (settings.deliveryMode === "CUSTOM") {
    if (!settings.smtpHost || !settings.smtpUsername || !settings.smtpPasswordEnc) {
      throw new AppError("MAIL_SMTP_NOT_CONFIGURED", 400, "Complete and test your custom SMTP settings before sending.");
    }
    transport = {
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      username: settings.smtpUsername,
      password: decryptSecret(settings.smtpPasswordEnc)
    };
  }

  return {
    userId: String(mailbox.userId),
    fromName: aliasName || settings.senderName || mailbox.displayName || "",
    replyTo: aliasReplyTo || settings.replyTo || null,
    signature: settings.signature || "",
    transport
  };
}

function safeExtraHeaders(headers?: Record<string, string>) {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (!/^[A-Za-z0-9-]{1,80}$/.test(key)) continue;
    result[key] = String(value).replace(/[\r\n]+/g, " ").trim().slice(0, 1000);
  }
  return result;
}

export async function sendSystemMailboxEmail(input: {
  fromAddress: string;
  fromName: string;
  replyTo?: string | null;
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string | null;
  references?: string[];
  attachments?: Array<{ filename: string; contentType: string; content: Buffer }>;
  transport?: SystemMailboxSmtpTransport | null;
  messageId?: string;
  headers?: Record<string, string>;
}) {
  const env = getServerEnv();
  if (!env.SYSTEM_MAIL_DOMAIN || !input.fromAddress.toLowerCase().endsWith(`@${env.SYSTEM_MAIL_DOMAIN}`)) {
    throw new AppError("SYSTEM_MAIL_NOT_CONFIGURED", 503, "System mailbox sending is not configured for this domain.");
  }

  const settings = await resolveUserMailboxDelivery(input.fromAddress);
  if (!settings) throw new AppError("MAILBOX_UNAVAILABLE", 404, "The sending mailbox could not be resolved.");
  await assertOutboundMailAllowed(settings.userId, [...input.to, ...(input.cc ?? [])], "GENERAL");
  const transport = input.transport ?? settings.transport ?? null;
  const client = transport ? customTransporter(transport) : getTransporter();
  const signature = settings.signature.trim();
  const text = signature && !input.text.trimEnd().endsWith(signature) ? `${input.text.trimEnd()}\n\n-- \n${signature}` : input.text;
  const messageId = input.messageId?.replace(/[\r\n]+/g, "").trim().slice(0, 500) || undefined;
  const result = await client.sendMail({
    from: { name: settings.fromName || input.fromName || env.SYSTEM_MAIL_FROM_NAME, address: input.fromAddress },
    replyTo: settings.replyTo || input.replyTo || undefined,
    envelope: { from: input.fromAddress, to: [...input.to, ...(input.cc ?? [])] },
    to: input.to,
    cc: input.cc,
    subject: input.subject,
    text,
    html: input.html || undefined,
    inReplyTo: input.inReplyTo || undefined,
    references: input.references?.length ? input.references : undefined,
    attachments: input.attachments,
    messageId,
    headers: { ...safeExtraHeaders(input.headers), "X-ResearVia-System-Mail": "1" }
  });

  return { messageId: result.messageId || null, accepted: result.accepted.map(String), rejected: result.rejected.map(String) };
}
