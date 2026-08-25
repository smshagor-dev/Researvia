import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const professorSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 220 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 260 },
    universityId: { type: Schema.Types.ObjectId, ref: "University", required: true, index: true },
    title: { type: String, default: "", trim: true, maxlength: 160 },
    department: { type: String, default: "", trim: true, maxlength: 180 },
    country: { type: String, required: true, trim: true, maxlength: 120 },
    city: { type: String, default: "", trim: true, maxlength: 120 },
    email: { type: String, default: "", trim: true, lowercase: true, maxlength: 320 },
    website: { type: String, default: "", trim: true, maxlength: 500 },
    orcid: { type: String, default: "", trim: true, maxlength: 120 },
    googleScholar: { type: String, default: "", trim: true, maxlength: 500 },
    openAlexId: { type: String, default: "", trim: true, maxlength: 120 },
    researchAreas: { type: [String], default: [] },
    keywords: { type: [String], default: [] },
    bio: { type: String, default: "", trim: true, maxlength: 4000 },
    publicationCount: { type: Number, default: 0, min: 0 },
    citedByCount: { type: Number, default: 0, min: 0 },
    source: { type: String, enum: ["MANUAL", "OPENALEX", "ORCID", "CSV", "JSON"], default: "MANUAL" },
    sourceUrl: { type: String, default: "", trim: true, maxlength: 500 },
    retrievedAt: { type: Date, default: null },
    lastVerifiedAt: { type: Date, default: null },
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT", index: true }
  },
  { timestamps: true, versionKey: false, strict: "throw" }
);

professorSchema.index({ slug: 1 }, { unique: true });
professorSchema.index({ fullName: "text", department: "text", researchAreas: "text", keywords: "text" });
professorSchema.index({ status: 1, country: 1, fullName: 1 });
professorSchema.index({ universityId: 1, status: 1, fullName: 1 });
professorSchema.index({ openAlexId: 1 }, { sparse: true });
professorSchema.index({ orcid: 1 }, { sparse: true });

export type ProfessorDocument = InferSchemaType<typeof professorSchema>;
export const Professor =
  (models.Professor as Model<ProfessorDocument> | undefined) ?? model<ProfessorDocument>("Professor", professorSchema);
