import nodemailer, { type Transporter } from "nodemailer";
import { getServerEnv } from "@/config/env";
import { AppError } from "@/server/errors/AppError";

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
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string | null;
  references?: string[];
  attachments?: Array<{ filename: string; contentType: string; content: Buffer }>;
}) {
  assertSmtpTransportReady();
  const env = getServerEnv();
  if (!env.SYSTEM_MAIL_DOMAIN || !input.fromAddress.toLowerCase().endsWith(`@${env.SYSTEM_MAIL_DOMAIN}`)) {
    throw new AppError("SYSTEM_MAIL_NOT_CONFIGURED", 503, "System mailbox sending is not configured for this domain.");
  }

  const result = await getTransporter().sendMail({
    from: { name: input.fromName || env.SYSTEM_MAIL_FROM_NAME, address: input.fromAddress },
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
