import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  senderType: { type: String, enum: ["CONNECTED", "SYSTEM"], default: "CONNECTED", required: true, index: true },
  emailAccountId: { type: Schema.Types.ObjectId, ref: "EmailAccount", default: null, index: true },
  name: { type: String, required: true, trim: true, maxlength: 180 },
  purpose: { type: String, required: true, trim: true, maxlength: 120 },
  subjectTemplate: { type: String, required: true, trim: true, maxlength: 300 },
  bodyTemplate: { type: String, required: true, maxlength: 12000 },
  status: { type: String, enum: ["DRAFT", "SCHEDULED", "RUNNING", "COMPLETED", "CANCELLED"], default: "DRAFT", index: true },
  scheduledAt: { type: Date, default: null },
  followUpAfterDays: { type: Number, default: null, min: 1, max: 60 }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, senderType: 1, createdAt: -1 });
export type OutreachCampaignDocument = InferSchemaType<typeof schema>;
export const OutreachCampaign = (models.OutreachCampaign as Model<OutreachCampaignDocument> | undefined) ?? model<OutreachCampaignDocument>("OutreachCampaign", schema);
