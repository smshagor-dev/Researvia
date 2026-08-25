import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const recommendationFeedbackSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  targetType: { type: String, enum: ["PROFESSOR", "SCHOLARSHIP", "OPPORTUNITY", "LAB", "PAPER"], required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  feedback: { type: String, enum: ["INTERESTED", "NOT_RELEVANT", "ALREADY_APPLIED", "WRONG_FIELD", "WRONG_COUNTRY", "TOO_COMPETITIVE"], required: true },
  reason: { type: String, default: "", maxlength: 1000 }
}, { timestamps: true, versionKey: false, strict: "throw" });
recommendationFeedbackSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

export type RecommendationFeedbackDocument = InferSchemaType<typeof recommendationFeedbackSchema>;
export const RecommendationFeedback = (models.RecommendationFeedback as Model<RecommendationFeedbackDocument> | undefined) ?? model<RecommendationFeedbackDocument>("RecommendationFeedback", recommendationFeedbackSchema);
