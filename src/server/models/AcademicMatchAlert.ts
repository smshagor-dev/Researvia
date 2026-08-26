import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  entityType: { type: String, enum: ["SCHOLARSHIP", "OPPORTUNITY", "LAB", "PROGRAM"], required: true, index: true },
  entityId: { type: Schema.Types.ObjectId, required: true, index: true },
  lastScore: { type: Number, required: true, min: 0, max: 100 },
  lastFingerprint: { type: String, required: true, maxlength: 180 },
  lastNotifiedAt: { type: Date, default: null, index: true }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ userId: 1, entityType: 1, entityId: 1 }, { unique: true });
export type AcademicMatchAlertDocument = InferSchemaType<typeof schema>;
export const AcademicMatchAlert = (models.AcademicMatchAlert as Model<AcademicMatchAlertDocument> | undefined) ?? model<AcademicMatchAlertDocument>("AcademicMatchAlert", schema);
