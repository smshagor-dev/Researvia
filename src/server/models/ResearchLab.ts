import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const researchLabSchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: "University", required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", default: null, index: true },
    name: { type: String, required: true, trim: true, maxlength: 240 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 260 },
    website: { type: String, default: "", trim: true, maxlength: 500 },
    contactEmail: { type: String, default: "", trim: true, lowercase: true, maxlength: 320 },
    location: { type: String, default: "", trim: true, maxlength: 240 },
    description: { type: String, default: "", trim: true, maxlength: 5000 },
    researchAreas: { type: [String], default: [] },
    professorIds: { type: [{ type: Schema.Types.ObjectId, ref: "Professor" }], default: [] },
    source: { type: String, enum: ["MANUAL", "OPENALEX", "CSV", "JSON"], default: "MANUAL" },
    sourceUrl: { type: String, default: "", trim: true, maxlength: 500 },
    retrievedAt: { type: Date, default: null },
    lastVerifiedAt: { type: Date, default: null },
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT", index: true }
  },
  { timestamps: true, versionKey: false, strict: "throw" }
);

researchLabSchema.index({ slug: 1 }, { unique: true });
researchLabSchema.index({ name: "text", description: "text", researchAreas: "text" });
researchLabSchema.index({ universityId: 1, status: 1, name: 1 });
researchLabSchema.index({ departmentId: 1, status: 1, name: 1 });

export type ResearchLabDocument = InferSchemaType<typeof researchLabSchema>;
export const ResearchLab = (models.ResearchLab as Model<ResearchLabDocument> | undefined) ?? model<ResearchLabDocument>("ResearchLab", researchLabSchema);
