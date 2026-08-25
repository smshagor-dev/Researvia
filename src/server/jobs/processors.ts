import { processOutreachFollowUp, processOutreachRecipient } from "@/server/outreach/outreach.service";
import { syncEmailMetadata } from "@/server/email/email-account.service";
import { reconcileOutreachReplies } from "@/server/outreach/outreach.service";

export async function processJob(type: string, payload: Record<string, unknown>) {
  if (type === "SEND_OUTREACH_RECIPIENT") {
    const recipientId = String(payload.recipientId ?? "");
    if (!recipientId) throw new Error("Missing recipientId.");
    await processOutreachRecipient(recipientId);
    return;
  }
  if (type === "SEND_OUTREACH_FOLLOWUP") {
    const recipientId = String(payload.recipientId ?? "");
    if (!recipientId) throw new Error("Missing recipientId.");
    await processOutreachFollowUp(recipientId);
    return;
  }
  if (type === "SYNC_EMAIL_ACCOUNT") {
    const userId = String(payload.userId ?? "");
    const accountId = String(payload.accountId ?? "");
    if (!userId || !accountId) throw new Error("Missing email sync identifiers.");
    await syncEmailMetadata(userId, accountId);
    await reconcileOutreachReplies(userId);
    return;
  }
  throw new Error(`Unsupported job type: ${type}`);
}
