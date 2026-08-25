import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  actorUserId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  action: { type: String, required: true, maxlength: 120, index: true },
  targetType: { type: String, required: true, maxlength: 80 },
  targetId: { type: String, default: null, maxlength: 160, index: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: null, maxlength: 64 }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ createdAt: -1 });
schema.index({ actorUserId: 1, createdAt: -1 });
export type AuditLogDocument = InferSchemaType<typeof schema>;
export const AuditLog = (models.AuditLog as Model<AuditLogDocument> | undefined) ?? model<AuditLogDocument>("AuditLog", schema);
