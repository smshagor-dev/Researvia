import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const analyticsEventSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  type: { type: String, enum: ["SEARCH", "SAVE", "APPLICATION", "OUTREACH", "RECOMMENDATION_VIEW", "RECOMMENDATION_FEEDBACK", "PROFILE_VIEW", "PAPER_SAVE"], required: true, index: true },
  entityType: { type: String, default: "", maxlength: 80 },
  entityId: { type: Schema.Types.ObjectId, default: null },
  country: { type: String, default: "", maxlength: 120 },
  field: { type: String, default: "", maxlength: 180 },
  metadata: { type: Map, of: String, default: {} }
}, { timestamps: true, versionKey: false, strict: "throw" });
analyticsEventSchema.index({ type: 1, createdAt: -1 });
analyticsEventSchema.index({ country: 1, field: 1, createdAt: -1 });

export type AnalyticsEventDocument = InferSchemaType<typeof analyticsEventSchema>;
export const AnalyticsEvent = (models.AnalyticsEvent as Model<AnalyticsEventDocument> | undefined) ?? model<AnalyticsEventDocument>("AnalyticsEvent", analyticsEventSchema);
