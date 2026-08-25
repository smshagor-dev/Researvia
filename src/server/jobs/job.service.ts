import { randomUUID } from "node:crypto";
import { connectDatabase } from "@/server/db/mongoose";
import { Job } from "@/server/models/Job";

export async function enqueueJob(input: {
  type: string;
  payload?: Record<string, unknown>;
  availableAt?: Date;
  maxAttempts?: number;
  idempotencyKey?: string;
}) {
  await connectDatabase();
  if (input.idempotencyKey) {
    const existing = await Job.findOne({ idempotencyKey: input.idempotencyKey }).lean();
    if (existing) return existing;
  }
  return Job.create({
    type: input.type,
    payload: input.payload ?? {},
    availableAt: input.availableAt ?? new Date(),
    maxAttempts: input.maxAttempts ?? 5,
    idempotencyKey: input.idempotencyKey ?? null
  });
}

export async function claimNextJob(workerId = randomUUID()) {
  await connectDatabase();
  const now = new Date();
  const staleLock = new Date(now.getTime() - 15 * 60 * 1000);
  return Job.findOneAndUpdate(
    {
      status: { $in: ["PENDING", "RETRYING", "PROCESSING"] },
      availableAt: { $lte: now },
      $or: [{ lockedAt: null }, { lockedAt: { $lt: staleLock } }]
    },
    { $set: { status: "PROCESSING", lockedAt: now, lockedBy: workerId }, $inc: { attempts: 1 } },
    { sort: { availableAt: 1, createdAt: 1 }, new: true }
  );
}

export async function completeJob(jobId: string) {
  await Job.updateOne({ _id: jobId }, { $set: { status: "COMPLETED", completedAt: new Date(), lockedAt: null, lockedBy: null, lastError: null } });
}

export async function failJob(jobId: string, attempts: number, maxAttempts: number, error: unknown) {
  const message = error instanceof Error ? error.message.slice(0, 2000) : "Unknown job error";
  const terminal = attempts >= maxAttempts;
  const delayMs = Math.min(60 * 60 * 1000, 30_000 * Math.pow(2, Math.max(0, attempts - 1)));
  await Job.updateOne(
    { _id: jobId },
    {
      $set: {
        status: terminal ? "FAILED" : "RETRYING",
        availableAt: terminal ? new Date() : new Date(Date.now() + delayMs),
        lockedAt: null,
        lockedBy: null,
        lastError: message
      }
    }
  );
}

export async function listJobs(limit = 100) {
  await connectDatabase();
  return Job.find().sort({ createdAt: -1 }).limit(Math.min(limit, 200)).lean();
}
