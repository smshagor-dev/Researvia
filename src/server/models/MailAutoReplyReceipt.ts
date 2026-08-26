import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  sender: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
  status: { type: String, enum: ["PENDING", "SENT", "FAILED"], default: "PENDING", index: true },
  nextEligibleAt: { type: Date, required: true, index: true },
  lastInboundMessageId: { type: Schema.Types.ObjectId, ref: "SystemMailMessage", required: true },
  lastReplyMessageId: { type: Schema.Types.ObjectId, ref: "SystemMailMessage", default: null },
  lastError: { type: String, default: null, maxlength: 1000 },
  sentAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ userId: 1, sender: 1 }, { unique: true });
schema.index({ status: 1, updatedAt: -1 });

export type MailAutoReplyReceiptDocument = InferSchemaType<typeof schema>;
export const MailAutoReplyReceipt = (models.MailAutoReplyReceipt as Model<MailAutoReplyReceiptDocument> | undefined) ?? model<MailAutoReplyReceiptDocument>("MailAutoReplyReceipt", schema);
