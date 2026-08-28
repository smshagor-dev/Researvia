import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  inboundMessageId: { type: Schema.Types.ObjectId, ref: "SystemMailMessage", required: true },
  senderAddress: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
  status: { type: String, enum: ["QUEUED", "PROCESSING", "SENT", "SKIPPED", "FAILED"], default: "QUEUED", index: true },
  reason: { type: String, default: null, maxlength: 160 },
  jobId: { type: Schema.Types.ObjectId, ref: "Job", default: null },
  providerMessageId: { type: String, default: null, maxlength: 500 },
  outboundMessageId: { type: Schema.Types.ObjectId, ref: "SystemMailMessage", default: null },
  sentAt: { type: Date, default: null, index: true },
  lastError: { type: String, default: null, maxlength: 2000 }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ userId: 1, inboundMessageId: 1 }, { unique: true });
schema.index({ userId: 1, senderAddress: 1, sentAt: -1 });
schema.index({ userId: 1, status: 1, createdAt: -1 });

export type SystemMailAutoReplyDocument = InferSchemaType<typeof schema>;
export const SystemMailAutoReply = (models.SystemMailAutoReply as Model<SystemMailAutoReplyDocument> | undefined) ?? model<SystemMailAutoReplyDocument>("SystemMailAutoReply", schema);
