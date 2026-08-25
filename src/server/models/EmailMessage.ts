import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  emailAccountId: { type: Schema.Types.ObjectId, ref: "EmailAccount", required: true, index: true },
  providerMessageId: { type: String, required: true, maxlength: 500 },
  providerThreadId: { type: String, default: null, maxlength: 500, index: true },
  direction: { type: String, enum: ["OUTBOUND", "INBOUND"], required: true },
  from: { type: String, required: true, maxlength: 320 },
  to: { type: [String], default: [] },
  subject: { type: String, default: "", maxlength: 500 },
  snippet: { type: String, default: "", maxlength: 1000 },
  sentAt: { type: Date, default: null },
  receivedAt: { type: Date, default: null },
  outreachRecipientId: { type: Schema.Types.ObjectId, ref: "OutreachRecipient", default: null, index: true }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ emailAccountId: 1, providerMessageId: 1 }, { unique: true });
schema.index({ userId: 1, createdAt: -1 });
export type EmailMessageDocument = InferSchemaType<typeof schema>;
export const EmailMessage = (models.EmailMessage as Model<EmailMessageDocument> | undefined) ?? model<EmailMessageDocument>("EmailMessage", schema);
