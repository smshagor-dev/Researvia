import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const rateLimitBucketSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, required: true, default: 0, min: 0 },
    expiresAt: { type: Date, required: true }
  },
  { versionKey: false, strict: "throw" }
);

rateLimitBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RateLimitBucketDocument = InferSchemaType<typeof rateLimitBucketSchema>;

export const RateLimitBucket =
  (models.RateLimitBucket as Model<RateLimitBucketDocument> | undefined) ??
  model<RateLimitBucketDocument>("RateLimitBucket", rateLimitBucketSchema);
