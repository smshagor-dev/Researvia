import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const privacyPreferenceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  aiProcessingAllowed: { type: Boolean, default: true },
  recommendationPersonalization: { type: Boolean, default: true },
  analyticsAllowed: { type: Boolean, default: true },
  emailSyncAllowed: { type: Boolean, default: true }
}, { timestamps: true, versionKey: false, strict: "throw" });
export type PrivacyPreferenceDocument = InferSchemaType<typeof privacyPreferenceSchema>;
export const PrivacyPreference = (models.PrivacyPreference as Model<PrivacyPreferenceDocument> | undefined) ?? model<PrivacyPreferenceDocument>("PrivacyPreference", privacyPreferenceSchema);
