import { getServerEnv } from "@/config/env";
import { ensureSystemMailbox } from "@/server/email/system-mailbox.service";

export async function provisionSystemMailboxIfConfigured(userId: string) {
  if (!getServerEnv().SYSTEM_MAIL_DOMAIN) return null;
  return ensureSystemMailbox(userId);
}

export async function provisionSystemMailboxBestEffort(userId: string) {
  try {
    return await provisionSystemMailboxIfConfigured(userId);
  } catch (error) {
    const name = error instanceof Error ? error.name : "UnknownError";
    console.error(`[mailbox-provision] Failed for user ${userId}: ${name}`);
    return null;
  }
}
