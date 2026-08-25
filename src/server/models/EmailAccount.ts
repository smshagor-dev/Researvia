import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  provider: { type: String, enum: ["GOOGLE", "MICROSOFT"], required: true, index: true },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
  accessTokenEnc: { type: String, required: true, select: false },
  refreshTokenEnc: { type: String, default: null, select: false },
  expiresAt: { type: Date, default: null },
  scopes: { type: [String], default: [] },
  status: { type: String, enum: ["CONNECTED", "REAUTH_REQUIRED", "DISCONNECTED"], default: "CONNECTED", index: true },
  connectedAt: { type: Date, default: Date.now },
  lastSyncedAt: { type: Date, default: null },
  disconnectedAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ userId: 1, provider: 1, email: 1 }, { unique: true });
export type EmailAccountDocument = InferSchemaType<typeof schema>;
export const EmailAccount = (models.EmailAccount as Model<EmailAccountDocument> | undefined) ?? model<EmailAccountDocument>("EmailAccount", schema);
