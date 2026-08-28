import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  mailboxId: { type: Schema.Types.ObjectId, ref: "SystemMailbox", required: true, index: true },
  localPart: { type: String, required: true, trim: true, lowercase: true, maxlength: 40, unique: true },
  address: { type: String, required: true, trim: true, lowercase: true, maxlength: 320, unique: true },
  label: { type: String, default: "", trim: true, maxlength: 80 },
  displayName: { type: String, default: "", trim: true, maxlength: 120 },
  replyTo: { type: String, default: "", trim: true, lowercase: true, maxlength: 320 },
  status: { type: String, enum: ["ACTIVE", "DISABLED"], default: "ACTIVE", index: true },
  isDefault: { type: Boolean, default: false },
  lastReceivedAt: { type: Date, default: null },
  lastSentAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ userId: 1, status: 1, createdAt: -1 });
schema.index({ userId: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

export type SystemMailAliasDocument = InferSchemaType<typeof schema>;
export const SystemMailAlias = (models.SystemMailAlias as Model<SystemMailAliasDocument> | undefined) ?? model<SystemMailAliasDocument>("SystemMailAlias", schema);
