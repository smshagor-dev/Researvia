import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  provider: { type: String, enum: ["MAILGUN"], required: true, index: true },
  providerEventId: { type: String, required: true, maxlength: 500 },
  eventType: { type: String, enum: ["ACCEPTED", "DELIVERED", "FAILED", "COMPLAINED", "UNSUBSCRIBED", "OTHER"], required: true, index: true },
  severity: { type: String, enum: ["INFO", "WARNING", "CRITICAL"], default: "INFO", index: true },
  recipient: { type: String, required: true, trim: true, lowercase: true, maxlength: 320, index: true },
  messageId: { type: String, default: null, maxlength: 500, index: true },
  detail: { type: String, default: "", maxlength: 2000 },
  occurredAt: { type: Date, required: true, index: true }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ provider: 1, providerEventId: 1 }, { unique: true });
schema.index({ eventType: 1, occurredAt: -1 });
schema.index({ recipient: 1, occurredAt: -1 });
export type MailDeliveryEventDocument = InferSchemaType<typeof schema>;
export const MailDeliveryEvent = (models.MailDeliveryEvent as Model<MailDeliveryEventDocument> | undefined) ?? model<MailDeliveryEventDocument>("MailDeliveryEvent", schema);
