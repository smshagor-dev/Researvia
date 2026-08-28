import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true, unique: true },
  deliveryMode: { type: String, enum: ["MANAGED", "CUSTOM"], default: "MANAGED", index: true },
  senderName: { type: String, default: "", trim: true, maxlength: 120 },
  signature: { type: String, default: "", maxlength: 4000 },
  replyTo: { type: String, default: "", trim: true, lowercase: true, maxlength: 320 },
  forwardingEnabled: { type: Boolean, default: false },
  forwardingEmail: { type: String, default: "", trim: true, lowercase: true, maxlength: 320 },
  webNotifications: { type: Boolean, default: true },
  pushNotifications: { type: Boolean, default: true },
  vacationEnabled: { type: Boolean, default: false, index: true },
  vacationEnabledAt: { type: Date, default: null },
  vacationStartAt: { type: Date, default: null, index: true },
  vacationEndAt: { type: Date, default: null, index: true },
  vacationSubject: { type: String, default: "", maxlength: 500 },
  vacationMessage: { type: String, default: "", maxlength: 10000 },
  vacationCooldownHours: { type: Number, default: 24, min: 1, max: 720 },
  smtpHost: { type: String, default: "", trim: true, maxlength: 255 },
  smtpPort: { type: Number, default: 587, min: 1, max: 65535 },
  smtpSecure: { type: Boolean, default: false },
  smtpUsername: { type: String, default: "", trim: true, maxlength: 320 },
  smtpPasswordEnc: { type: String, default: null, select: false },
  imapHost: { type: String, default: "", trim: true, maxlength: 255 },
  imapPort: { type: Number, default: 993, min: 1, max: 65535 },
  imapSecure: { type: Boolean, default: true },
  imapUsername: { type: String, default: "", trim: true, maxlength: 320 },
  imapPasswordEnc: { type: String, default: null, select: false },
  imapSyncEnabled: { type: Boolean, default: false, index: true },
  imapMailbox: { type: String, default: "INBOX", trim: true, maxlength: 255 },
  imapUidValidity: { type: String, default: null, maxlength: 64 },
  imapLastUid: { type: Number, default: 0, min: 0 },
  imapSyncStatus: { type: String, enum: ["IDLE", "RUNNING", "ERROR"], default: "IDLE", index: true },
  imapSyncStartedAt: { type: Date, default: null },
  imapLastImportedCount: { type: Number, default: 0, min: 0 },
  lastSmtpTestAt: { type: Date, default: null },
  lastImapTestAt: { type: Date, default: null },
  lastImapSyncAt: { type: Date, default: null },
  lastConfigError: { type: String, default: null, maxlength: 1000 }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ deliveryMode: 1, updatedAt: -1 });
schema.index({ imapSyncEnabled: 1, lastImapSyncAt: 1 });
schema.index({ vacationEnabled: 1, vacationStartAt: 1, vacationEndAt: 1 });

export type SystemMailSettingsDocument = InferSchemaType<typeof schema>;
export const SystemMailSettings = (models.SystemMailSettings as Model<SystemMailSettingsDocument> | undefined) ?? model<SystemMailSettingsDocument>("SystemMailSettings", schema);
