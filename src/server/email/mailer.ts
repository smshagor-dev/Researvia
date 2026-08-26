import nodemailer, { type Transporter } from "nodemailer";
import { getServerEnv } from "@/config/env";
import { AppError } from "@/server/errors/AppError";

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
}) {
  const env = getServerEnv();
  if (!env.SYSTEM_MAIL_DOMAIN || !input.fromAddress.toLowerCase().endsWith(`@${env.SYSTEM_MAIL_DOMAIN}`)) {
    throw new AppError("SYSTEM_MAIL_NOT_CONFIGURED", 503, "System mailbox sending is not configured for this domain.");
  }

  const client = input.transport ? customTransporter(input.transport) : getTransporter();
  const result = await client.sendMail({
    from: { name: input.fromName || env.SYSTEM_MAIL_FROM_NAME, address: input.fromAddress },
    replyTo: input.replyTo || undefined,
    envelope: { from: input.fromAddress, to: [...input.to, ...(input.cc ?? [])] },
    to: input.to,
    cc: input.cc,
    subject: input.subject,
    text: input.text,
    html: input.html || undefined,
    inReplyTo: input.inReplyTo || undefined,
    references: input.references?.length ? input.references : undefined,
    attachments: input.attachments,
    headers: { "X-ResearVia-System-Mail": "1" }
  });

  return { messageId: result.messageId || null, accepted: result.accepted.map(String), rejected: result.rejected.map(String) };
}
