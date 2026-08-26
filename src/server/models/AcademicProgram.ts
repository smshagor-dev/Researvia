import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const academicProgramSchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: "University", required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", default: null, index: true },
    name: { type: String, required: true, trim: true, maxlength: 260 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 280 },
    degreeLevel: { type: String, enum: ["BACHELORS", "MASTERS", "PHD", "POSTDOC", "CERTIFICATE", "OTHER"], required: true, index: true },
    website: { type: String, default: "", trim: true, maxlength: 500 },
    deadline: { type: Date, default: null, index: true },
    intake: { type: String, default: "", trim: true, maxlength: 160 },
    funding: { type: String, default: "", trim: true, maxlength: 1000 },
    requirements: { type: [String], default: [] },
    researchAreas: { type: [String], default: [] },
    description: { type: String, default: "", trim: true, maxlength: 5000 },
    source: { type: String, enum: ["MANUAL", "OPENALEX", "CSV", "JSON"], default: "MANUAL" },
    sourceUrl: { type: String, default: "", trim: true, maxlength: 500 },
    retrievedAt: { type: Date, default: null },
    lastVerifiedAt: { type: Date, default: null },
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT", index: true }
  },
  { timestamps: true, versionKey: false, strict: "throw" }
);

academicProgramSchema.index({ slug: 1 }, { unique: true });
academicProgramSchema.index({ name: "text", description: "text", researchAreas: "text", requirements: "text" });
academicProgramSchema.index({ universityId: 1, status: 1, degreeLevel: 1, name: 1 });
academicProgramSchema.index({ departmentId: 1, status: 1, degreeLevel: 1, name: 1 });

export type AcademicProgramDocument = InferSchemaType<typeof academicProgramSchema>;
export const AcademicProgram = (models.AcademicProgram as Model<AcademicProgramDocument> | undefined) ?? model<AcademicProgramDocument>("AcademicProgram", academicProgramSchema);
