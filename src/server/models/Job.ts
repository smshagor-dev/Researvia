import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  type: { type: String, required: true, trim: true, maxlength: 80, index: true },
  status: { type: String, enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "RETRYING", "CANCELLED"], default: "PENDING", index: true },
  payload: { type: Schema.Types.Mixed, default: {} },
  attempts: { type: Number, default: 0, min: 0 },
  maxAttempts: { type: Number, default: 5, min: 1, max: 20 },
  availableAt: { type: Date, default: Date.now, index: true },
  lockedAt: { type: Date, default: null },
  lockedBy: { type: String, default: null, maxlength: 120 },
  lastError: { type: String, default: null, maxlength: 2000 },
  completedAt: { type: Date, default: null },
  idempotencyKey: { type: String, default: null, maxlength: 200 }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ status: 1, availableAt: 1, createdAt: 1 });
schema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
export type JobDocument = InferSchemaType<typeof schema>;
export const Job = (models.Job as Model<JobDocument> | undefined) ?? model<JobDocument>("Job", schema);
