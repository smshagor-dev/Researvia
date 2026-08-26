import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  localPart: { type: String, required: true, trim: true, lowercase: true, maxlength: 64, unique: true },
  address: { type: String, required: true, trim: true, lowercase: true, maxlength: 320, unique: true },
  displayName: { type: String, required: true, trim: true, maxlength: 120 },
  status: { type: String, enum: ["ACTIVE", "SUSPENDED", "CLOSED"], default: "ACTIVE", index: true },
  quotaBytes: { type: Number, default: 1024 * 1024 * 1024, min: 0 },
  usedBytes: { type: Number, default: 0, min: 0 },
  lastReceivedAt: { type: Date, default: null },
  lastSentAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ status: 1, createdAt: -1 });
export type SystemMailboxDocument = InferSchemaType<typeof schema>;
export const SystemMailbox = (models.SystemMailbox as Model<SystemMailboxDocument> | undefined) ?? model<SystemMailboxDocument>("SystemMailbox", schema);
