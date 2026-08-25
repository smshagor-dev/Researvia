import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const scholarshipSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 280 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 300 },
    provider: { type: String, required: true, trim: true, maxlength: 220 },
    universityId: { type: Schema.Types.ObjectId, ref: "University", default: null, index: true },
    country: { type: String, required: true, trim: true, maxlength: 120 },
    degreeLevels: { type: [String], default: [] },
    studyFields: { type: [String], default: [] },
    fundingType: { type: String, enum: ["FULL", "PARTIAL", "OTHER", "UNKNOWN"], default: "UNKNOWN" },
    fundingAmount: { type: String, default: "", trim: true, maxlength: 240 },
    tuitionCoverage: { type: String, default: "", trim: true, maxlength: 500 },
    stipend: { type: String, default: "", trim: true, maxlength: 500 },
    travelSupport: { type: String, default: "", trim: true, maxlength: 500 },
    eligibility: { type: String, default: "", trim: true, maxlength: 5000 },
    nationalityRestrictions: { type: [String], default: [] },
    languageRequirements: { type: [String], default: [] },
    requiredDocuments: { type: [String], default: [] },
    applicationUrl: { type: String, required: true, trim: true, maxlength: 700 },
    openDate: { type: Date, default: null },
    deadline: { type: Date, default: null, index: true },
    source: { type: String, enum: ["MANUAL", "UNIVERSITY", "GOVERNMENT", "CSV", "JSON"], default: "MANUAL" },
    sourceUrl: { type: String, required: true, trim: true, maxlength: 700 },
    retrievedAt: { type: Date, default: null },
    lastVerifiedAt: { type: Date, default: null },
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT", index: true }
  },
  { timestamps: true, versionKey: false, strict: "throw" }
);

scholarshipSchema.index({ slug: 1 }, { unique: true });
scholarshipSchema.index({ name: "text", provider: "text", studyFields: "text", eligibility: "text" });
scholarshipSchema.index({ status: 1, country: 1, deadline: 1 });
scholarshipSchema.index({ status: 1, fundingType: 1, deadline: 1 });

export type ScholarshipDocument = InferSchemaType<typeof scholarshipSchema>;
export const Scholarship =
  (models.Scholarship as Model<ScholarshipDocument> | undefined) ?? model<ScholarshipDocument>("Scholarship", scholarshipSchema);
