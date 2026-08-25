import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const researchLabSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 240 },
  slug: { type: String, required: true, lowercase: true, trim: true, maxlength: 260 },
  universityId: { type: Schema.Types.ObjectId, ref: "University", required: true, index: true },
  principalInvestigatorId: { type: Schema.Types.ObjectId, ref: "Professor", default: null, index: true },
  description: { type: String, default: "", trim: true, maxlength: 6000 },
  researchTopics: { type: [String], default: [] },
  memberNames: { type: [String], default: [] },
  websiteUrl: { type: String, default: "", trim: true, maxlength: 700 },
  openPositions: { type: [String], default: [] },
  fundingSignals: { type: [String], default: [] },
  source: { type: String, enum: ["MANUAL", "UNIVERSITY", "OPENALEX", "ORCID", "CROSSREF"], default: "MANUAL" },
  sourceUrl: { type: String, required: true, trim: true, maxlength: 700 },
  lastVerifiedAt: { type: Date, default: null, index: true },
  status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT", index: true }
}, { timestamps: true, versionKey: false, strict: "throw" });

researchLabSchema.index({ slug: 1 }, { unique: true });
researchLabSchema.index({ name: "text", researchTopics: "text", description: "text" });
researchLabSchema.index({ status: 1, universityId: 1, lastVerifiedAt: -1 });

export type ResearchLabDocument = InferSchemaType<typeof researchLabSchema>;
export const ResearchLab = (models.ResearchLab as Model<ResearchLabDocument> | undefined) ?? model<ResearchLabDocument>("ResearchLab", researchLabSchema);
