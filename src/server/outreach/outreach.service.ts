import { connectDatabase } from "@/server/db/mongoose";
import { AppError } from "@/server/errors/AppError";
import { EmailAccount } from "@/server/models/EmailAccount";
import { EmailMessage } from "@/server/models/EmailMessage";
import { OutreachCampaign } from "@/server/models/OutreachCampaign";
import { OutreachRecipient } from "@/server/models/OutreachRecipient";
import { Professor } from "@/server/models/Professor";
import { User } from "@/server/models/User";
import { enqueueJob } from "@/server/jobs/job.service";
import { notifyUser } from "@/server/notifications/notification.service";
import { sendConnectedEmail } from "@/server/email/email-account.service";

export type CreateCampaignInput = {
  accountId: string;
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
  const [account, user] = await Promise.all([
    EmailAccount.findOne({ _id: input.accountId, userId, status: "CONNECTED" }).lean(),
    User.findById(userId).lean()
  ]);
  if (!account) throw new AppError("EMAIL_ACCOUNT_NOT_FOUND", 404, "Connect an email account before creating outreach.");
  if (!user) throw new AppError("ACCOUNT_UNAVAILABLE", 404, "Account not found.");

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
    emailAccountId: account._id,
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

export async function processOutreachRecipient(recipientId: string) {
  await connectDatabase();
  const recipient = await OutreachRecipient.findById(recipientId);
  if (!recipient || ["SENT", "REPLIED", "CANCELLED"].includes(recipient.status)) return;
  const campaign = await OutreachCampaign.findById(recipient.campaignId);
  if (!campaign || campaign.status === "CANCELLED") return;
  recipient.status = "SENDING";
  await recipient.save();
  try {
    const sent = await sendConnectedEmail({ userId: recipient.userId.toString(), accountId: campaign.emailAccountId.toString(), to: recipient.email, subject: recipient.subject, body: recipient.body });
    const now = new Date();
    recipient.status = "SENT";
    recipient.sentAt = now;
    recipient.providerMessageId = sent.providerMessageId;
    recipient.providerThreadId = sent.providerThreadId;
    if (campaign.followUpAfterDays) recipient.followUpDueAt = new Date(now.getTime() + campaign.followUpAfterDays * 24 * 60 * 60 * 1000);
    await recipient.save();
    if (sent.providerMessageId) {
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
  await sendConnectedEmail({ userId: recipient.userId.toString(), accountId: campaign.emailAccountId.toString(), to: recipient.email, subject: `Re: ${recipient.subject}`, body });
  recipient.followUpSentAt = new Date();
  await recipient.save();
  await notifyUser({ userId: recipient.userId.toString(), type: "OUTREACH_FOLLOWUP", title: "Follow-up sent", message: `A scheduled follow-up was sent to ${recipient.name || recipient.email}.`, href: `/dashboard/outreach/${campaign._id.toString()}` });
}

export async function reconcileOutreachReplies(userId: string) {
  await connectDatabase();
  const outbound = await OutreachRecipient.find({ userId, status: "SENT", sentAt: { $ne: null } }).lean();
  let replies = 0;
  for (const recipient of outbound) {
    const query = recipient.providerThreadId
      ? { userId, direction: "INBOUND", providerThreadId: recipient.providerThreadId, createdAt: { $gte: recipient.sentAt } }
      : { userId, direction: "INBOUND", from: { $regex: recipient.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" }, createdAt: { $gte: recipient.sentAt } };
    const message = await EmailMessage.findOne(query).lean();
    if (message) {
      await OutreachRecipient.updateOne({ _id: recipient._id, userId }, { $set: { status: "REPLIED" } });
      replies += 1;
    }
  }
  return { replies };
}
