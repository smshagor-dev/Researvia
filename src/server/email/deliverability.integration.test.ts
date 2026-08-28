import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectDatabase, disconnectDatabase } from "@/server/db/mongoose";
import {
  assertOutboundMailAllowed,
  recordMailgunDeliveryFeedback,
  setMailSuppressionActive
} from "@/server/email/deliverability.service";
import { MailDeliveryEvent } from "@/server/models/MailDeliveryEvent";
import { MailSuppression } from "@/server/models/MailSuppression";

const recipient = `hardening-${new mongoose.Types.ObjectId().toString()}@example.test`;
const providerEventId = `fixture-event-${new mongoose.Types.ObjectId().toString()}`;
const actorUserId = new mongoose.Types.ObjectId();

describe("mail deliverability suppression lifecycle", () => {
  beforeAll(async () => {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required for deliverability integration tests.");
    await connectDatabase();
  });

  afterAll(async () => {
    await Promise.all([
      MailDeliveryEvent.deleteMany({ provider: "MAILGUN", providerEventId }),
      MailSuppression.deleteMany({ email: recipient })
    ]);
    await disconnectDatabase();
  });

  it("records a permanent Mailgun failure idempotently and blocks the suppressed recipient", async () => {
    const feedback = {
      providerEventId,
      event: "failed",
      recipient,
      messageId: "<fixture-message@researvia.test>",
      severity: "permanent",
      reason: "550 mailbox unavailable",
      timestamp: Math.floor(Date.now() / 1000)
    };

    const first = await recordMailgunDeliveryFeedback(feedback);
    const second = await recordMailgunDeliveryFeedback(feedback);

    expect(first.eventType).toBe("FAILED");
    expect(first.severity).toBe("CRITICAL");
    expect(first.suppressed).toBe(true);
    expect(first.reason).toBe("BOUNCE");
    expect(second.recipient).toBe(recipient);
    expect(await MailDeliveryEvent.countDocuments({ provider: "MAILGUN", providerEventId })).toBe(1);
    expect(await MailSuppression.countDocuments({ email: recipient, active: true, reason: "BOUNCE" })).toBe(1);

    await expect(assertOutboundMailAllowed(actorUserId.toString(), [recipient], "GENERAL")).rejects.toMatchObject({
      code: "MAIL_RECIPIENT_SUPPRESSED",
      status: 409
    });
  }, 15_000);

  it("allows an administrator to restore a suppressed address", async () => {
    const suppression = await MailSuppression.findOne({ email: recipient, active: true }).lean();
    expect(suppression).toBeTruthy();

    const restored = await setMailSuppressionActive(actorUserId.toString(), String(suppression?._id), false);
    expect(restored.active).toBe(false);

    const row = await MailSuppression.findOne({ email: recipient }).lean();
    expect(row?.active).toBe(false);
    expect(row?.restoredAt).toBeTruthy();
    expect(String(row?.restoredBy)).toBe(actorUserId.toString());
  }, 15_000);
});
