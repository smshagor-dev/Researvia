import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const universitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 240 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 260 },
    aliases: { type: [String], default: [] },
    country: { type: String, required: true, trim: true, maxlength: 120 },
    city: { type: String, default: "", trim: true, maxlength: 120 },
    region: { type: String, default: "", trim: true, maxlength: 160 },
    website: { type: String, default: "", trim: true, maxlength: 500 },
    officialDomains: { type: [{ type: String, trim: true, lowercase: true, maxlength: 253 }], default: [] },
    description: { type: String, default: "", trim: true, maxlength: 3000 },
    logoUrl: { type: String, default: "", trim: true, maxlength: 500 },
    externalIds: {
      ror: { type: String, default: "", trim: true, maxlength: 120 },
      openAlex: { type: String, default: "", trim: true, maxlength: 120 }
    },
    source: { type: String, enum: ["MANUAL", "OPENALEX", "ROR", "CSV", "JSON"], default: "MANUAL" },
    sourceUrl: { type: String, default: "", trim: true, maxlength: 500 },
    retrievedAt: { type: Date, default: null },
    lastVerifiedAt: { type: Date, default: null },
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT", index: true }
  },
  { timestamps: true, versionKey: false, strict: "throw" }
);

universitySchema.index({ slug: 1 }, { unique: true });
universitySchema.index({ name: "text", aliases: "text", city: "text", country: "text" });
universitySchema.index({ status: 1, country: 1, name: 1 });
universitySchema.index({ "externalIds.ror": 1 }, { sparse: true });
universitySchema.index({ "externalIds.openAlex": 1 }, { sparse: true });
universitySchema.index({ officialDomains: 1 });

export type UniversityDocument = InferSchemaType<typeof universitySchema>;
export const University =
  (models.University as Model<UniversityDocument> | undefined) ?? model<UniversityDocument>("University", universitySchema);
