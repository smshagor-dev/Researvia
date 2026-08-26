import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const departmentSchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: "University", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 240 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 260 },
    website: { type: String, default: "", trim: true, maxlength: 500 },
    description: { type: String, default: "", trim: true, maxlength: 4000 },
    researchAreas: { type: [String], default: [] },
    source: { type: String, enum: ["MANUAL", "OPENALEX", "CSV", "JSON"], default: "MANUAL" },
    sourceUrl: { type: String, default: "", trim: true, maxlength: 500 },
    retrievedAt: { type: Date, default: null },
    lastVerifiedAt: { type: Date, default: null },
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT", index: true }
  },
  { timestamps: true, versionKey: false, strict: "throw" }
);

departmentSchema.index({ slug: 1 }, { unique: true });
departmentSchema.index({ name: "text", researchAreas: "text" });
departmentSchema.index({ universityId: 1, status: 1, name: 1 });

export type DepartmentDocument = InferSchemaType<typeof departmentSchema>;
export const Department = (models.Department as Model<DepartmentDocument> | undefined) ?? model<DepartmentDocument>("Department", departmentSchema);
