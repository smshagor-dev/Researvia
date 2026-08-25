import { getServerEnv } from "@/config/env";
import { sendEmail } from "@/server/email/mailer";

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      "\"": "&quot;"
    };
    return entities[character] ?? character;
  });
}

function actionUrl(path: string, token: string): string {
  const url = new URL(path, getServerEnv().APP_URL);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function sendVerificationEmail(to: string, displayName: string, token: string): Promise<void> {
  const url = actionUrl("/verify-email", token);
  const safeName = escapeHtml(displayName);
  const safeUrl = escapeHtml(url);

  await sendEmail({
    to,
    subject: "Verify your ResearVia account",
    text: `Hi ${displayName},\n\nVerify your ResearVia account: ${url}\n\nThis link expires in 24 hours.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111827"><h2>Verify your ResearVia account</h2><p>Hi ${safeName},</p><p>Confirm your email address to finish creating your free student account.</p><p><a href="${safeUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Verify email</a></p><p style="color:#6b7280;font-size:13px">This link expires in 24 hours. If you did not create this account, you can ignore this message.</p></div>`
  });
}

export async function sendPasswordResetEmail(to: string, displayName: string, token: string): Promise<void> {
  const url = actionUrl("/reset-password", token);
  const safeName = escapeHtml(displayName);
  const safeUrl = escapeHtml(url);

  await sendEmail({
    to,
    subject: "Reset your ResearVia password",
    text: `Hi ${displayName},\n\nReset your ResearVia password: ${url}\n\nThis link expires in 60 minutes.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111827"><h2>Reset your password</h2><p>Hi ${safeName},</p><p>Use the secure link below to choose a new password.</p><p><a href="${safeUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Reset password</a></p><p style="color:#6b7280;font-size:13px">This link expires in 60 minutes and can be used once. If you did not request a reset, ignore this message.</p></div>`
  });
}
