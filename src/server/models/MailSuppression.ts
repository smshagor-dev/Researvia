import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 320, unique: true, index: true },
  reason: { type: String, enum: ["BOUNCE", "COMPLAINT", "UNSUBSCRIBE", "MANUAL"], required: true, index: true },
  source: { type: String, enum: ["MAILGUN", "ADMIN"], required: true, index: true },
  active: { type: Boolean, default: true, index: true },
  providerEventId: { type: String, default: null, maxlength: 500 },
  detail: { type: String, default: "", maxlength: 1000 },
  firstSuppressedAt: { type: Date, default: Date.now },
  lastEventAt: { type: Date, default: Date.now, index: true },
  restoredAt: { type: Date, default: null },
  restoredBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ active: 1, reason: 1, lastEventAt: -1 });
export type MailSuppressionDocument = InferSchemaType<typeof schema>;
export const MailSuppression = (models.MailSuppression as Model<MailSuppressionDocument> | undefined) ?? model<MailSuppressionDocument>("MailSuppression", schema);
