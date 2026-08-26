import { createHmac } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.SYSTEM_MAIL_DOMAIN = "researvia.test";
process.env.MAILGUN_WEBHOOK_SIGNING_KEY = "integration-mailgun-signing-key";

import { disconnectDatabase } from "@/server/db/mongoose";
import { Job } from "@/server/models/Job";
import { Notification } from "@/server/models/Notification";
import { SystemMailbox } from "@/server/models/SystemMailbox";
import { SystemMailMessage } from "@/server/models/SystemMailMessage";
import { User } from "@/server/models/User";
import {
  ensureSystemMailbox,
  receiveMailgunMessage,
  verifyMailgunInboundSignature
} from "@/server/email/system-mailbox.service";

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
  beforeAll(() => {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required for mailbox integration tests.");
  });

  afterAll(async () => {
    if (fixtureIds.length) {
      const notifications = await Notification.find({ userId: { $in: fixtureIds } }).select({ _id: 1 }).lean();
      const notificationIds = notifications.map((item) => item._id.toString());
      await Promise.all([
        notificationIds.length ? Job.deleteMany({ "payload.notificationId": { $in: notificationIds } }) : Promise.resolve(),
        Notification.deleteMany({ userId: { $in: fixtureIds } }),
        SystemMailMessage.deleteMany({ userId: { $in: fixtureIds } }),
        SystemMailbox.deleteMany({ userId: { $in: fixtureIds } }),
        User.deleteMany({ _id: { $in: fixtureIds } })
      ]);
    }
    await disconnectDatabase();
  });

  it("provisions one immutable unique username+number address per user", async () => {
    const firstUser = await user("Md Shahanur Islam Shagor");
    const secondUser = await user("Md Shahanur Islam Shagor");
    const first = await ensureSystemMailbox(firstUser._id.toString());
    const again = await ensureSystemMailbox(firstUser._id.toString());
    const second = await ensureSystemMailbox(secondUser._id.toString());

    expect(first.address).toBe(again.address);
    expect(first.address).toMatch(/^shagor\d{4,6}@researvia\.test$/);
    expect(second.address).toMatch(/^shagor\d{4,6}@researvia\.test$/);
    expect(second.address).not.toBe(first.address);
    expect(await SystemMailbox.countDocuments({ userId: firstUser._id })).toBe(1);
  });

  it("accepts a valid signed inbound email exactly once and creates notification delivery", async () => {
    const owner = await user();
    const mailbox = await ensureSystemMailbox(owner._id.toString());
    const payload = mailgunForm({ recipient: mailbox.address, messageId: "<mailbox-inbound-1@university.edu>", token: "fixed-inbound-token" });

    expect(verifyMailgunInboundSignature(payload)).toBe(true);
    expect(verifyMailgunInboundSignature({ ...payload, signature: "0".repeat(64) })).toBe(false);

    const first = await receiveMailgunMessage(payload.form);
    const second = await receiveMailgunMessage(payload.form);
    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(true);
    expect(second.duplicate).toBe(true);

    const messages = await SystemMailMessage.find({ userId: owner._id }).lean();
    expect(messages).toHaveLength(1);
    expect(messages[0]?.folder).toBe("INBOX");
    expect(messages[0]?.readAt).toBeNull();
    expect(messages[0]?.from).toBe("ada@university.edu");

    const notification = await Notification.findOne({ userId: owner._id, type: "SYSTEM_MAIL" }).lean();
    expect(notification?.href).toContain("/dashboard/mail?message=");
    expect(await Job.countDocuments({ type: "SEND_PUSH_NOTIFICATION", "payload.notificationId": notification?._id.toString() })).toBe(1);
  });

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
  });
});
