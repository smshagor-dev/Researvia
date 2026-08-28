import { createHash } from "node:crypto";
import { connectDatabase } from "@/server/db/mongoose";
import { AppError } from "@/server/errors/AppError";
import { RateLimitBucket } from "@/server/models/RateLimitBucket";

let rateLimitIndexesPromise: Promise<void> | null = null;

async function prepareRateLimitStore(): Promise<void> {
  await connectDatabase();
  if (!rateLimitIndexesPromise) {
    rateLimitIndexesPromise = RateLimitBucket.createIndexes()
      .then(() => undefined)
      .catch((error: unknown) => {
        rateLimitIndexesPromise = null;
        throw error;
      });
  }
  await rateLimitIndexesPromise;
}

export async function enforceRateLimitUnits(
  scope: string,
  identifier: string,
  limit: number,
  windowMs: number,
  units = 1,
  message = "Too many attempts. Please wait a little before trying again."
): Promise<void> {
  await prepareRateLimitStore();
  const amount = Math.max(1, Math.min(Math.floor(units), Math.max(1, limit)));
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = createHash("sha256")
    .update(`${scope}:${identifier}:${windowStart}`, "utf8")
    .digest("base64url");

  const bucket = await RateLimitBucket.findOneAndUpdate(
    { key },
    {
      $inc: { count: amount },
      $setOnInsert: { expiresAt: new Date(windowStart + windowMs) }
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  ).lean();

  if ((bucket?.count ?? 0) > limit) {
    throw new AppError("RATE_LIMITED", 429, message);
  }
}

export async function enforceRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowMs: number
): Promise<void> {
  return enforceRateLimitUnits(scope, identifier, limit, windowMs, 1);
}
