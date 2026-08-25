import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const cvAnalysisSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  documentId: { type: Schema.Types.ObjectId, ref: "StudentDocument", required: true, index: true },
  score: { type: Number, required: true, min: 0, max: 100 },
  detectedSections: { type: [String], default: [] },
  missingSections: { type: [String], default: [] },
  extractedSkills: { type: [String], default: [] },
  extractedPublications: { type: [String], default: [] },
  extractedEducation: { type: [String], default: [] },
  suggestions: { type: [String], default: [] },
  method: { type: String, enum: ["DETERMINISTIC", "AI_ASSISTED"], default: "DETERMINISTIC" }
}, { timestamps: true, versionKey: false, strict: "throw" });
cvAnalysisSchema.index({ userId: 1, documentId: 1 }, { unique: true });

export type CvAnalysisDocument = InferSchemaType<typeof cvAnalysisSchema>;
export const CvAnalysis = (models.CvAnalysis as Model<CvAnalysisDocument> | undefined) ?? model<CvAnalysisDocument>("CvAnalysis", cvAnalysisSchema);
