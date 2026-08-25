import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const academicFeedSourceSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 240 },
  url: { type: String, required: true, unique: true, trim: true, maxlength: 1000 },
  format: { type: String, enum: ["JSON", "RSS", "ATOM"], required: true },
  entityType: { type: String, enum: ["SCHOLARSHIP", "OPPORTUNITY"], required: true },
  provider: { type: String, required: true, trim: true, maxlength: 160 },
  enabled: { type: Boolean, default: true },
  lastSyncedAt: { type: Date, default: null },
  lastError: { type: String, default: "", maxlength: 2000 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true, versionKey: false, strict: "throw" });
academicFeedSourceSchema.index({ enabled: 1, entityType: 1, updatedAt: -1 });
export type AcademicFeedSourceDocument = InferSchemaType<typeof academicFeedSourceSchema>;
export const AcademicFeedSource = (models.AcademicFeedSource as Model<AcademicFeedSourceDocument> | undefined) ?? model<AcademicFeedSourceDocument>("AcademicFeedSource", academicFeedSourceSchema);
