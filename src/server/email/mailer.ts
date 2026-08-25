import nodemailer, { type Transporter } from "nodemailer";
import { getServerEnv } from "@/config/env";
import { AppError } from "@/server/errors/AppError";

let transporter: Transporter | null = null;

export function assertEmailReady(): void {
  const env = getServerEnv();
  if (!env.SMTP_HOST || !env.SMTP_FROM) {
    throw new AppError(
      "EMAIL_SERVICE_UNAVAILABLE",
      503,
      "Email delivery is not configured yet. Please try again later."
    );
  }

  if ((env.SMTP_USER && !env.SMTP_PASSWORD) || (!env.SMTP_USER && env.SMTP_PASSWORD)) {
    throw new AppError(
      "EMAIL_SERVICE_UNAVAILABLE",
      503,
      "Email delivery is not configured correctly."
    );
  }
}

function getTransporter(): Transporter {
  assertEmailReady();
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
  const env = getServerEnv();
  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html
  });
}
