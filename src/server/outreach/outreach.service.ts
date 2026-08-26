import { connectDatabase } from "@/server/db/mongoose";
import { AppError } from "@/server/errors/AppError";
import { EmailAccount } from "@/server/models/EmailAccount";
import { EmailMessage } from "@/server/models/EmailMessage";
import { OutreachCampaign } from "@/server/models/OutreachCampaign";
import { OutreachRecipient } from "@/server/models/OutreachRecipient";
import { Professor } from "@/server/models/Professor";
import { SystemMailMessage } from "@/server/models/SystemMailMessage";
import { User } from "@/server/models/User";
import { enqueueJob } from "@/server/jobs/job.service";
import { notifyUser } from "@/server/notifications/notification.service";
import { sendConnectedEmail } from "@/server/email/email-account.service";
import { ensureSystemMailbox, sendSystemMailMessage } from "@/server/email/system-mailbox.service";

export type CreateCampaignInput = {
  senderType?: "CONNECTED" | "SYSTEM";
  accountId?: string | null;
  name: string;
  purpose: string;
  subject: string;
  body: string;
  professorIds?: string[];
  recipients?: Array<{ email: string; name?: string }>;
  followUpAfterDays?: number | null;
};

function render(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*(name|professor|student)\s*\}\}/gi, (_, key: string) => values[key.toLowerCase()] ?? "");
}

export async function createCampaign(userId: string, input: CreateCampaignInput) {
  await connectDatabase();
  const senderType = input.senderType ?? (input.accountId ? "CONNECTED" : "SYSTEM");
  const user = await User.findById(userId).lean();
  if (!user) throw new AppError("ACCOUNT_UNAVAILABLE", 404, "Account not found.");

  let account: Awaited<ReturnType<typeof EmailAccount.findOne>> | null = null;
  if (senderType === "CONNECTED") {
    if (!input.accountId) throw new AppError("EMAIL_ACCOUNT_NOT_FOUND", 400, "Choose a connected email account.");
    account = await EmailAccount.findOne({ _id: input.accountId, userId, status: "CONNECTED" });
    if (!account) throw new AppError("EMAIL_ACCOUNT_NOT_FOUND", 404, "Connected email account not found.");
  } else {
    await ensureSystemMailbox(userId);
  }

  const professorIds = Array.from(new Set(input.professorIds ?? [])).slice(0, 100);
  const professors = professorIds.length
    ? await Professor.find({ _id: { $in: professorIds }, status: "PUBLISHED", email: { $ne: "" } }).select("_id fullName email").lean()
    : [];
  const targets = new Map<string, { email: string; name: string; professorId: string | null }>();
  for (const professor of professors) targets.set(professor.email.toLowerCase(), { email: professor.email.toLowerCase(), name: professor.fullName, professorId: professor._id.toString() });
  for (const manual of input.recipients ?? []) {
    const email = manual.email.trim().toLowerCase();
    if (email) targets.set(email, { email, name: manual.name?.trim() ?? "", professorId: null });
  }
  if (!targets.size) throw new AppError("OUTREACH_RECIPIENT_REQUIRED", 400, "Add at least one professor with a public email or a valid recipient.");
  if (targets.size > 100) throw new AppError("OUTREACH_LIMIT", 400, "A campaign can contain at most 100 recipients.");

  const campaign = await OutreachCampaign.create({
    userId,
    senderType,
    emailAccountId: account?._id ?? null,
    name: input.name,
    purpose: input.purpose,
    subjectTemplate: input.subject,
    bodyTemplate: input.body,
    followUpAfterDays: input.followUpAfterDays ?? null
  });
  const docs = Array.from(targets.values()).map((target) => {
    const values = { name: target.name, professor: target.name, student: user.displayName };
    return {
      campaignId: campaign._id,
      userId,
      professorId: target.professorId,
      email: target.email,
      name: target.name,
      subject: render(input.subject, values),
      body: render(input.body, values),
      status: "DRAFT"
    };
  });
  await OutreachRecipient.insertMany(docs, { ordered: true });
  return getCampaign(userId, campaign._id.toString());
}

export async function listCampaigns(userId: string) {
  await connectDatabase();
  return OutreachCampaign.find({ userId }).sort({ createdAt: -1 }).lean();
}

export async function getCampaign(userId: string, campaignId: string) {
  await connectDatabase();
  const campaign = await OutreachCampaign.findOne({ _id: campaignId, userId }).lean();
  if (!campaign) throw new AppError("CAMPAIGN_NOT_FOUND", 404, "Outreach campaign not found.");
  const recipients = await OutreachRecipient.find({ campaignId: campaign._id, userId }).sort({ createdAt: 1 }).lean();
  return { campaign, recipients };
}

export async function scheduleCampaign(userId: string, campaignId: string, scheduledAt?: Date) {
  await connectDatabase();
  const campaign = await OutreachCampaign.findOne({ _id: campaignId, userId });
  if (!campaign) throw new AppError("CAMPAIGN_NOT_FOUND", 404, "Outreach campaign not found.");
  if (["COMPLETED", "CANCELLED"].includes(campaign.status)) throw new AppError("CAMPAIGN_FINAL", 409, "This campaign cannot be scheduled.");
  if (campaign.senderType === "SYSTEM") await ensureSystemMailbox(userId);
  else if (!campaign.emailAccountId || !(await EmailAccount.exists({ _id: campaign.emailAccountId, userId, status: "CONNECTED" }))) throw new AppError("EMAIL_ACCOUNT_NOT_FOUND", 409, "Reconnect the campaign email account before scheduling.");

  const when = scheduledAt && scheduledAt.getTime() > Date.now() ? scheduledAt : new Date();
  const recipients = await OutreachRecipient.find({ campaignId: campaign._id, userId, status: { $in: ["DRAFT", "FAILED"] } });
  for (const recipient of recipients) {
    recipient.status = when.getTime() > Date.now() ? "SCHEDULED" : "SENDING";
    recipient.scheduledAt = when;
    recipient.lastError = null;
    await recipient.save();
    await enqueueJob({
      type: "SEND_OUTREACH_RECIPIENT",
      payload: { recipientId: recipient._id.toString() },
      availableAt: when,
      idempotencyKey: `outreach:${recipient._id.toString()}:initial`
    });
  }
  campaign.status = when.getTime() > Date.now() ? "SCHEDULED" : "RUNNING";
  campaign.scheduledAt = when;
  await campaign.save();
  return { queued: recipients.length, scheduledAt: when.toISOString() };
}

async function sendForCampaign(campaign: InstanceType<typeof OutreachCampaign>, recipient: InstanceType<typeof OutreachRecipient>, body: string, subject: string, replyToMessageId?: string | null) {
  if (campaign.senderType === "SYSTEM") {
    const sent = await sendSystemMailMessage(recipient.userId.toString(), { to: [recipient.email], subject, text: body, replyToMessageId: replyToMessageId ?? null });
    return { providerMessageId: sent.internetMessageId, providerThreadId: sent.threadKey };
  }
  if (!campaign.emailAccountId) throw new AppError("EMAIL_ACCOUNT_NOT_FOUND", 409, "Campaign email account is unavailable.");
  return sendConnectedEmail({ userId: recipient.userId.toString(), accountId: campaign.emailAccountId.toString(), to: recipient.email, subject, body });
}

export async function processOutreachRecipient(recipientId: string) {
  await connectDatabase();
  const recipient = await OutreachRecipient.findById(recipientId);
  if (!recipient || ["SENT", "REPLIED", "CANCELLED"].includes(recipient.status)) return;
  const campaign = await OutreachCampaign.findById(recipient.campaignId);
  if (!campaign || campaign.status === "CANCELLED") return;
  recipient.status = "SENDING";
  await recipient.save();
  try {
    const sent = await sendForCampaign(campaign, recipient, recipient.body, recipient.subject);
    const now = new Date();
    recipient.status = "SENT";
    recipient.sentAt = now;
    recipient.providerMessageId = sent.providerMessageId;
    recipient.providerThreadId = sent.providerThreadId;
    if (campaign.followUpAfterDays) recipient.followUpDueAt = new Date(now.getTime() + campaign.followUpAfterDays * 24 * 60 * 60 * 1000);
    await recipient.save();

    if (campaign.senderType === "CONNECTED" && sent.providerMessageId && campaign.emailAccountId) {
      const account = await EmailAccount.findById(campaign.emailAccountId).lean();
      if (account) await EmailMessage.updateOne(
        { emailAccountId: account._id, providerMessageId: sent.providerMessageId },
        { $setOnInsert: { userId: recipient.userId, emailAccountId: account._id, providerMessageId: sent.providerMessageId, providerThreadId: sent.providerThreadId, direction: "OUTBOUND", from: account.email, to: [recipient.email], subject: recipient.subject, snippet: recipient.body.slice(0, 1000), sentAt: now, outreachRecipientId: recipient._id } },
        { upsert: true }
      );
    }
    if (recipient.followUpDueAt) await enqueueJob({ type: "SEND_OUTREACH_FOLLOWUP", payload: { recipientId }, availableAt: recipient.followUpDueAt, idempotencyKey: `outreach:${recipientId}:followup` });
    await notifyUser({ userId: recipient.userId.toString(), type: "OUTREACH_SENT", title: "Outreach sent", message: `Your message to ${recipient.name || recipient.email} was sent.`, href: `/dashboard/outreach/${campaign._id.toString()}` });
  } catch (error) {
    recipient.status = "FAILED";
    recipient.lastError = error instanceof Error ? error.message.slice(0, 2000) : "Email send failed";
    await recipient.save();
    throw error;
  }
}

export async function processOutreachFollowUp(recipientId: string) {
  await connectDatabase();
  const recipient = await OutreachRecipient.findById(recipientId);
  if (!recipient || recipient.status !== "SENT" || recipient.followUpSentAt) return;
  const campaign = await OutreachCampaign.findById(recipient.campaignId);
  if (!campaign || campaign.status === "CANCELLED") return;
  const user = await User.findById(recipient.userId).lean();
  if (!user) return;
  const body = `Dear ${recipient.name || "Professor"},\n\nI wanted to follow up on my previous email regarding ${campaign.purpose}. I remain very interested and would appreciate the opportunity to connect when convenient.\n\nBest regards,\n${user.displayName}`;

  let replyToMessageId: string | null = null;
  if (campaign.senderType === "SYSTEM" && recipient.providerThreadId) {
    const previous = await SystemMailMessage.findOne({ userId: recipient.userId, threadKey: recipient.providerThreadId }).sort({ createdAt: -1 }).select({ _id: 1 }).lean();
    replyToMessageId = previous?._id.toString() ?? null;
  }
  await sendForCampaign(campaign, recipient, body, `Re: ${recipient.subject}`, replyToMessageId);
  recipient.followUpSentAt = new Date();
  await recipient.save();
  await notifyUser({ userId: recipient.userId.toString(), type: "OUTREACH_FOLLOWUP", title: "Follow-up sent", message: `A scheduled follow-up was sent to ${recipient.name || recipient.email}.`, href: `/dashboard/outreach/${campaign._id.toString()}` });
}

export async function reconcileOutreachReplies(userId: string) {
  await connectDatabase();
  const outbound = await OutreachRecipient.find({ userId, status: "SENT", sentAt: { $ne: null } }).lean();
  const campaignIds = [...new Set(outbound.map((item) => item.campaignId.toString()))];
  const campaigns = await OutreachCampaign.find({ _id: { $in: campaignIds }, userId }).select({ senderType: 1 }).lean();
  const senderTypeByCampaign = new Map(campaigns.map((item) => [item._id.toString(), item.senderType]));
  let replies = 0;

  for (const recipient of outbound) {
    const since = recipient.sentAt ? new Date(recipient.sentAt) : new Date(0);
    const escapedEmail = recipient.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const senderType = senderTypeByCampaign.get(recipient.campaignId.toString()) ?? "CONNECTED";
    const message = senderType === "SYSTEM"
      ? recipient.providerThreadId
        ? await SystemMailMessage.findOne({ userId, direction: "INBOUND", threadKey: recipient.providerThreadId, createdAt: { $gte: since } }).lean()
        : await SystemMailMessage.findOne({ userId, direction: "INBOUND", from: { $regex: escapedEmail, $options: "i" }, createdAt: { $gte: since } }).lean()
      : recipient.providerThreadId
        ? await EmailMessage.findOne({ userId, direction: "INBOUND", providerThreadId: recipient.providerThreadId, createdAt: { $gte: since } }).lean()
        : await EmailMessage.findOne({ userId, direction: "INBOUND", from: { $regex: escapedEmail, $options: "i" }, createdAt: { $gte: since } }).lean();
    if (message) {
      await OutreachRecipient.updateOne({ _id: recipient._id, userId }, { $set: { status: "REPLIED" } });
      replies += 1;
    }
  }
  return { replies };
}
