import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const featureFlagSchema = new Schema({
  key: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 120 },
  description: { type: String, default: "", maxlength: 500 },
  enabled: { type: Boolean, default: false },
  environments: { type: [String], default: ["production", "development", "test"] },
  allowedRoles: { type: [{ type: String, enum: ["STUDENT", "ADMIN", "SUPER_ADMIN"] }], default: [] },
  rolloutPercent: { type: Number, default: 100, min: 0, max: 100 },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true, versionKey: false, strict: "throw" });

export type FeatureFlagDocument = InferSchemaType<typeof featureFlagSchema>;
export const FeatureFlag = (models.FeatureFlag as Model<FeatureFlagDocument> | undefined) ?? model<FeatureFlagDocument>("FeatureFlag", featureFlagSchema);
