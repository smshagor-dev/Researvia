import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { SystemMailSettings } from "@/server/models/SystemMailSettings";

const attachmentSchema = new Schema({
  fileId: { type: Schema.Types.ObjectId, required: true },
  filename: { type: String, required: true, maxlength: 255 },
  contentType: { type: String, required: true, maxlength: 160 },
  size: { type: Number, required: true, min: 0 }
}, { _id: false, strict: "throw" });

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  mailboxId: { type: Schema.Types.ObjectId, ref: "SystemMailbox", required: true, index: true },
  internetMessageId: { type: String, required: true, maxlength: 500 },
  providerMessageId: { type: String, default: null, maxlength: 500 },
  source: { type: String, enum: ["SYSTEM", "MAILGUN", "IMAP"], default: "SYSTEM", index: true },
  externalAccountKey: { type: String, default: null, maxlength: 500 },
  externalMailbox: { type: String, default: null, maxlength: 255 },
  externalUidValidity: { type: String, default: null, maxlength: 64 },
  externalUid: { type: Number, default: null, min: 1 },
  externalFlags: { type: [String], default: [] },
  threadKey: { type: String, required: true, maxlength: 500, index: true },
  inReplyTo: { type: String, default: null, maxlength: 500 },
  references: { type: [String], default: [] },
  direction: { type: String, enum: ["INBOUND", "OUTBOUND", "DRAFT"], required: true, index: true },
  folder: { type: String, enum: ["INBOX", "SENT", "DRAFTS", "TRASH"], required: true, index: true },
  from: { type: String, required: true, trim: true, maxlength: 320 },
  to: { type: [String], default: [] },
  cc: { type: [String], default: [] },
  replyTo: { type: String, default: null, maxlength: 320 },
  subject: { type: String, default: "", maxlength: 500 },
  textBody: { type: String, default: "", maxlength: 200000 },
  htmlBody: { type: String, default: "", maxlength: 500000 },
  snippet: { type: String, default: "", maxlength: 1000 },
  attachments: { type: [attachmentSchema], default: [] },
  scheduledAt: { type: Date, default: null, index: true },
  scheduleStatus: { type: String, enum: ["PENDING", "SENDING", "CANCELLED"], default: null, index: true },
  scheduleJobId: { type: Schema.Types.ObjectId, ref: "Job", default: null },
  scheduleCancelledAt: { type: Date, default: null },
  readAt: { type: Date, default: null, index: true },
  starredAt: { type: Date, default: null, index: true },
  sentAt: { type: Date, default: null },
  receivedAt: { type: Date, default: null },
  rawHeaders: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.pre("save", async function () {
  if (this.direction !== "OUTBOUND") return;
  const settings = await SystemMailSettings.findOne({ userId: this.userId }).select("signature").lean();
  const signature = settings?.signature?.trim() ?? "";
  if (!signature || this.textBody.trimEnd().endsWith(signature)) return;
  this.textBody = `${this.textBody.trimEnd()}\n\n-- \n${signature}`.slice(0, 200000);
  this.snippet = this.textBody.trim().slice(0, 1000);
});

schema.index({ mailboxId: 1, internetMessageId: 1 }, { unique: true });
schema.index({ userId: 1, folder: 1, createdAt: -1 });
schema.index({ userId: 1, threadKey: 1, createdAt: 1 });
schema.index({ userId: 1, starredAt: 1, createdAt: -1 });
schema.index({ userId: 1, scheduleStatus: 1, scheduledAt: 1 });
schema.index({ subject: "text", from: "text", to: "text", snippet: "text" });
schema.index(
  { userId: 1, source: 1, externalAccountKey: 1, externalMailbox: 1, externalUidValidity: 1, externalUid: 1 },
  { unique: true, partialFilterExpression: { source: "IMAP", externalUid: { $type: "number" } } }
);

export type SystemMailMessageDocument = InferSchemaType<typeof schema>;
export const SystemMailMessage = (models.SystemMailMessage as Model<SystemMailMessageDocument> | undefined) ?? model<SystemMailMessageDocument>("SystemMailMessage", schema);
