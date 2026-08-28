import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  senderAddress: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
  nextAllowedAt: { type: Date, required: true, index: true },
  lastInboundMessageId: { type: Schema.Types.ObjectId, ref: "SystemMailMessage", required: true },
  lastSentAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ userId: 1, senderAddress: 1 }, { unique: true });
schema.index({ nextAllowedAt: 1, updatedAt: 1 });

export type SystemMailAutoReplyThrottleDocument = InferSchemaType<typeof schema>;
export const SystemMailAutoReplyThrottle = (models.SystemMailAutoReplyThrottle as Model<SystemMailAutoReplyThrottleDocument> | undefined) ?? model<SystemMailAutoReplyThrottleDocument>("SystemMailAutoReplyThrottle", schema);
