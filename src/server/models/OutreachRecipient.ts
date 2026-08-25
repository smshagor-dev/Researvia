import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  campaignId: { type: Schema.Types.ObjectId, ref: "OutreachCampaign", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  professorId: { type: Schema.Types.ObjectId, ref: "Professor", default: null, index: true },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
  name: { type: String, default: "", trim: true, maxlength: 220 },
  subject: { type: String, required: true, maxlength: 300 },
  body: { type: String, required: true, maxlength: 12000 },
  status: { type: String, enum: ["DRAFT", "SCHEDULED", "SENDING", "SENT", "FAILED", "REPLIED", "CANCELLED"], default: "DRAFT", index: true },
  scheduledAt: { type: Date, default: null, index: true },
  sentAt: { type: Date, default: null },
  providerMessageId: { type: String, default: null, maxlength: 500 },
  providerThreadId: { type: String, default: null, maxlength: 500 },
  lastError: { type: String, default: null, maxlength: 2000 },
  followUpDueAt: { type: Date, default: null, index: true },
  followUpSentAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ campaignId: 1, email: 1 }, { unique: true });
schema.index({ userId: 1, status: 1, createdAt: -1 });
export type OutreachRecipientDocument = InferSchemaType<typeof schema>;
export const OutreachRecipient = (models.OutreachRecipient as Model<OutreachRecipientDocument> | undefined) ?? model<OutreachRecipientDocument>("OutreachRecipient", schema);
