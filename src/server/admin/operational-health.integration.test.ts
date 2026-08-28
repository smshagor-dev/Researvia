import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getOperationalHealth } from "@/server/admin/operational-health.service";
import { connectDatabase, disconnectDatabase } from "@/server/db/mongoose";
import { AcademicFeedSource } from "@/server/models/AcademicFeedSource";
import { EmailAccount } from "@/server/models/EmailAccount";
import { Job } from "@/server/models/Job";
import { PushSubscription } from "@/server/models/PushSubscription";

const fixtureIds = {
  emailAccounts: [] as mongoose.Types.ObjectId[],
  feeds: [] as mongoose.Types.ObjectId[],
  jobs: [] as mongoose.Types.ObjectId[],
  pushes: [] as mongoose.Types.ObjectId[]
};

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

describe("operational health observability", () => {
  beforeAll(async () => {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required for operational integration tests.");
    await connectDatabase();

    const userId = new mongoose.Types.ObjectId();
    const [account, feed, push, job] = await Promise.all([
      EmailAccount.create({
        userId,
        provider: "GOOGLE",
        email: `health-${userId.toString()}@example.test`,
        accessTokenEnc: "fixture-encrypted-token",
        status: "REAUTH_REQUIRED",
        lastSyncedAt: hoursAgo(72)
      }),
      AcademicFeedSource.create({
        name: `Health fixture ${userId.toString()}`,
        entityType: "OPPORTUNITY",
        format: "JSON",
        url: `https://example.test/feed/${userId.toString()}`,
        defaultCountry: "Testland",
        defaultProvider: "Fixture University",
        active: true,
        lastSyncedAt: hoursAgo(72),
        lastError: "Fixture upstream feed failure",
        createdBy: userId
      }),
      PushSubscription.create({
        userId,
        endpoint: `https://push.example.test/${userId.toString()}`,
        keys: { p256dh: "fixture-p256dh", auth: "fixture-auth" },
        enabled: true,
        failureCount: 3,
        lastFailureAt: new Date(),
        lastError: "Fixture push failure"
      }),
      Job.create({
        type: "HEALTH_FIXTURE_JOB",
        status: "PROCESSING",
        payload: { fixture: userId.toString() },
        attempts: 1,
        maxAttempts: 5,
        availableAt: hoursAgo(2),
        lockedAt: hoursAgo(1),
        lockedBy: "fixture-worker"
      })
    ]);

    fixtureIds.emailAccounts.push(account._id);
    fixtureIds.feeds.push(feed._id);
    fixtureIds.pushes.push(push._id);
    fixtureIds.jobs.push(job._id);
  });

  afterAll(async () => {
    await Promise.all([
      EmailAccount.deleteMany({ _id: { $in: fixtureIds.emailAccounts } }),
      AcademicFeedSource.deleteMany({ _id: { $in: fixtureIds.feeds } }),
      PushSubscription.deleteMany({ _id: { $in: fixtureIds.pushes } }),
      Job.deleteMany({ _id: { $in: fixtureIds.jobs } })
    ]);
    await disconnectDatabase();
  });

  it("surfaces provider, feed, push, and stalled-worker incidents as actionable health signals", async () => {
    const health = await getOperationalHealth();

    expect(health.overall).toBe("CRITICAL");
    expect(health.providers.reauthRequired).toBeGreaterThanOrEqual(1);
    expect(health.feeds.errors).toBeGreaterThanOrEqual(1);
    expect(health.push.unhealthy).toBeGreaterThanOrEqual(1);
    expect(health.queue.staleProcessing).toBeGreaterThanOrEqual(1);

    expect(health.incidents.some((incident) => incident.category === "PROVIDER" && incident.severity === "CRITICAL")).toBe(true);
    expect(health.incidents.some((incident) => incident.category === "FEED" && incident.severity === "CRITICAL")).toBe(true);
    expect(health.incidents.some((incident) => incident.category === "PUSH")).toBe(true);
    expect(health.incidents.some((incident) => incident.category === "QUEUE" && incident.severity === "CRITICAL")).toBe(true);
  }, 15_000);
});
