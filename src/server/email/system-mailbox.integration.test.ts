import { createHmac } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.SYSTEM_MAIL_DOMAIN = "researvia.test";
process.env.MAILGUN_WEBHOOK_SIGNING_KEY = "integration-mailgun-signing-key";

import { connectDatabase, disconnectDatabase } from "@/server/db/mongoose";
import { createSystemMailAlias, listSystemMailSenderIdentities, resolveSystemMailSender, updateSystemMailAlias } from "@/server/email/system-mail-alias.service";
import { ensureSystemMailbox, receiveMailgunMessage, verifyMailgunInboundSignature } from "@/server/email/system-mailbox.service";
import { queueVacationReplyForInboundMessage } from "@/server/email/vacation-responder.service";
import { Job } from "@/server/models/Job";
import { Notification } from "@/server/models/Notification";
import { SystemMailAlias } from "@/server/models/SystemMailAlias";
import { SystemMailAutoReply } from "@/server/models/SystemMailAutoReply";
import { SystemMailbox } from "@/server/models/SystemMailbox";
import { SystemMailMessage } from "@/server/models/SystemMailMessage";
import { SystemMailSettings } from "@/server/models/SystemMailSettings";
import { User } from "@/server/models/User";

const fixtureIds: mongoose.Types.ObjectId[] = [];

async function user(displayName = "Mailbox Student") {
  const row = await User.create({
    email: `mailbox-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    displayName,
    passwordHash: "fixture",
    role: "STUDENT",
    status: "ACTIVE",
    emailVerifiedAt: new Date()
  });
  fixtureIds.push(row._id);
  return row;
}

function aliasLocal(prefix = "research") {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.slice(0, 38);
}

function mailgunForm(input: { recipient: string; messageId: string; inReplyTo?: string; token?: string }) {
  const token = input.token ?? `token-${Math.random().toString(16).slice(2)}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", process.env.MAILGUN_WEBHOOK_SIGNING_KEY as string).update(`${timestamp}${token}`).digest("hex");
  const headers: Array<[string, string]> = [["Message-Id", input.messageId], ["From", "Professor Ada <ada@university.edu>"]];
  if (input.inReplyTo) headers.push(["In-Reply-To", input.inReplyTo], ["References", input.inReplyTo]);
  const form = new FormData();
  form.set("timestamp", timestamp);
  form.set("token", token);
  form.set("signature", signature);
  form.set("recipient", input.recipient);
  form.set("sender", "ada@university.edu");
  form.set("from", "Professor Ada <ada@university.edu>");
  form.set("subject", "Research supervision opportunity");
  form.set("body-plain", "Thank you for reaching out. I would be happy to discuss the project.");
  form.set("message-headers", JSON.stringify(headers));
  return { form, timestamp, token, signature };
}

describe("system mailbox", () => {
  beforeAll(async () => {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required for mailbox integration tests.");
    await connectDatabase();
  });

  afterAll(async () => {
    if (fixtureIds.length) {
      const notifications = await Notification.find({ userId: { $in: fixtureIds } }).select({ _id: 1 }).lean();
      const notificationIds = notifications.map((item) => item._id.toString());
      const userIds = fixtureIds.map(String);
      await Promise.all([
        notificationIds.length ? Job.deleteMany({ "payload.notificationId": { $in: notificationIds } }) : Promise.resolve(),
        Job.deleteMany({ "payload.userId": { $in: userIds } }),
        Notification.deleteMany({ userId: { $in: fixtureIds } }),
        SystemMailAutoReply.deleteMany({ userId: { $in: fixtureIds } }),
        SystemMailAlias.deleteMany({ userId: { $in: fixtureIds } }),
        SystemMailSettings.deleteMany({ userId: { $in: fixtureIds } }),
        SystemMailMessage.deleteMany({ userId: { $in: fixtureIds } }),
        SystemMailbox.deleteMany({ userId: { $in: fixtureIds } }),
        User.deleteMany({ _id: { $in: fixtureIds } })
      ]);
    }
    await disconnectDatabase();
  });

  it("provisions one immutable unique username+number address per user", async () => {
    const a = await user("Md Shahanur Islam Shagor");
    const b = await user("Md Shahanur Islam Shagor");
    const first = await ensureSystemMailbox(a._id.toString());
    const again = await ensureSystemMailbox(a._id.toString());
    const second = await ensureSystemMailbox(b._id.toString());
    expect(first.address).toBe(again.address);
    expect(first.address).toMatch(/^shagor\d{4,6}@researvia\.test$/);
    expect(second.address).not.toBe(first.address);
    expect(await SystemMailbox.countDocuments({ userId: a._id })).toBe(1);
  }, 15000);

  it("accepts a valid signed inbound email exactly once and creates notification delivery", async () => {
    const owner = await user();
    const mailbox = await ensureSystemMailbox(owner._id.toString());
    const payload = mailgunForm({ recipient: mailbox.address, messageId: "<mailbox-inbound-1@university.edu>", token: "fixed-inbound-token" });
    expect(verifyMailgunInboundSignature(payload)).toBe(true);
    expect(verifyMailgunInboundSignature({ ...payload, signature: "0".repeat(64) })).toBe(false);
    const first = await receiveMailgunMessage(payload.form);
    const second = await receiveMailgunMessage(payload.form);
    expect(first.accepted).toBe(true);
    expect(second.duplicate).toBe(true);
    const messages = await SystemMailMessage.find({ userId: owner._id }).lean();
    expect(messages).toHaveLength(1);
    const notification = await Notification.findOne({ userId: owner._id, type: "SYSTEM_MAIL" }).lean();
    expect(notification?.href).toContain("/dashboard/mail?message=");
    expect(await Job.countDocuments({ type: "SEND_PUSH_NOTIFICATION", "payload.notificationId": notification?._id.toString() })).toBe(1);
  }, 15000);

  it("threads professor replies against a previously sent system message", async () => {
    const owner = await user("Research Student");
    const mailbox = await ensureSystemMailbox(owner._id.toString());
    const outboundInternetId = "<outbound-thread-seed@researvia.test>";
    await SystemMailMessage.create({
      userId: owner._id,
      mailboxId: mailbox._id,
      internetMessageId: outboundInternetId,
      threadKey: "thread-seed",
      direction: "OUTBOUND",
      folder: "SENT",
      from: mailbox.address,
      to: ["ada@university.edu"],
      subject: "Research supervision opportunity",
      textBody: "Hello Professor Ada",
      snippet: "Hello Professor Ada",
      readAt: new Date(),
      sentAt: new Date()
    });
    const payload = mailgunForm({ recipient: mailbox.address, messageId: "<reply-thread-1@university.edu>", inReplyTo: outboundInternetId });
    await receiveMailgunMessage(payload.form);
    const inbound = await SystemMailMessage.findOne({ userId: owner._id, internetMessageId: "<reply-thread-1@university.edu>" }).lean();
    expect(inbound?.threadKey).toBe("thread-seed");
  }, 15000);

  it("queues exactly one durable vacation reply job per inbound message", async () => {
    const owner = await user("Away Student");
    const mailbox = await ensureSystemMailbox(owner._id.toString());
    await SystemMailSettings.findOneAndUpdate(
      { userId: owner._id },
      { $set: { vacationEnabled: true, vacationEnabledAt: new Date(Date.now() - 5000), vacationMessage: "Thank you for your email. I am currently away.", vacationCooldownHours: 24 }, $setOnInsert: { userId: owner._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const payload = mailgunForm({ recipient: mailbox.address, messageId: "<vacation-inbound-1@university.edu>", token: "vacation-inbound-token" });
    const received = await receiveMailgunMessage(payload.form);
    const messageId = "messageId" in received && received.messageId ? String(received.messageId) : "";
    expect(messageId).not.toBe("");
    const first = await queueVacationReplyForInboundMessage(messageId);
    const second = await queueVacationReplyForInboundMessage(messageId);
    expect(first.queued).toBe(true);
    expect(second.queued).toBe(true);
    expect(await SystemMailAutoReply.countDocuments({ userId: owner._id, inboundMessageId: messageId })).toBe(1);
    expect(await Job.countDocuments({ type: "SEND_VACATION_SYSTEM_MAIL", "payload.inboundMessageId": messageId })).toBe(1);
  }, 15000);

  it("creates a durable alias and resolves it as the default sender identity", async () => {
    const owner = await user("Alias Student");
    await ensureSystemMailbox(owner._id.toString());
    const created = await createSystemMailAlias(owner._id.toString(), {
      localPart: aliasLocal(),
      label: "Research outreach",
      displayName: "Alias Student Research",
      replyTo: "alias.student@example.com",
      isDefault: true
    });
    const identities = await listSystemMailSenderIdentities(owner._id.toString());
    expect(identities).toHaveLength(2);
    expect(identities.find((identity) => identity.address === created.address)?.isDefault).toBe(true);
    const sender = await resolveSystemMailSender(owner._id.toString());
    expect(sender.address).toBe(created.address);
    expect(sender.displayName).toBe("Alias Student Research");
    expect(sender.replyTo).toBe("alias.student@example.com");
  }, 15000);

  it("routes inbound alias mail to the owner and preserves the alias recipient", async () => {
    const owner = await user("Alias Inbox Student");
    const mailbox = await ensureSystemMailbox(owner._id.toString());
    const created = await createSystemMailAlias(owner._id.toString(), { localPart: aliasLocal("inbox"), label: "Applications" });
    const payload = mailgunForm({ recipient: String(created.address), messageId: `<alias-inbound-${Date.now()}@university.edu>` });
    const received = await receiveMailgunMessage(payload.form);
    expect(received.accepted).toBe(true);
    const inbound = await SystemMailMessage.findOne({ userId: owner._id, internetMessageId: { $regex: /^<alias-inbound-/ } }).sort({ createdAt: -1 }).lean();
    expect(inbound?.mailboxId.toString()).toBe(mailbox._id.toString());
    expect(inbound?.to).toEqual([created.address]);
    const alias = await SystemMailAlias.findById(created._id).lean();
    expect(alias?.lastReceivedAt).toBeTruthy();
  }, 15000);

  it("rejects a disabled alias for inbound routing and outbound sender selection", async () => {
    const owner = await user("Disabled Alias Student");
    await ensureSystemMailbox(owner._id.toString());
    const created = await createSystemMailAlias(owner._id.toString(), { localPart: aliasLocal("disabled") });
    await updateSystemMailAlias(owner._id.toString(), String(created._id), { status: "DISABLED" });
    const payload = mailgunForm({ recipient: String(created.address), messageId: `<disabled-alias-${Date.now()}@university.edu>` });
    const received = await receiveMailgunMessage(payload.form);
    expect(received.accepted).toBe(false);
    expect("reason" in received ? received.reason : "").toBe("unknown-mailbox");
    await expect(resolveSystemMailSender(owner._id.toString(), String(created.address))).rejects.toMatchObject({ code: "MAIL_SENDER_IDENTITY_UNAVAILABLE" });
  }, 15000);
});
