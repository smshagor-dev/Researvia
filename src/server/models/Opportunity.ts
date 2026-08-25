import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const opportunityTypes = ["PHD", "MASTERS", "RESEARCH_ASSISTANT", "TEACHING_ASSISTANT", "RESEARCH_INTERNSHIP", "INDUSTRY_RESEARCH_INTERNSHIP", "FELLOWSHIP", "CONFERENCE", "WORKSHOP", "SUMMER_PROGRAM", "RESEARCH_PROJECT", "OTHER"] as const;

const opportunitySchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
    type: { type: String, enum: opportunityTypes, required: true, index: true },
    organization: { type: String, required: true, trim: true, maxlength: 240 },
    universityId: { type: Schema.Types.ObjectId, ref: "University", default: null, index: true },
    professorId: { type: Schema.Types.ObjectId, ref: "Professor", default: null, index: true },
    country: { type: String, required: true, trim: true, maxlength: 120 },
    city: { type: String, default: "", trim: true, maxlength: 120 },
    fields: { type: [String], default: [] },
    researchAreas: { type: [String], default: [] },
    funding: { type: String, default: "", trim: true, maxlength: 800 },
    eligibility: { type: String, default: "", trim: true, maxlength: 5000 },
    description: { type: String, default: "", trim: true, maxlength: 8000 },
    requiredDocuments: { type: [String], default: [] },
    applicationUrl: { type: String, required: true, trim: true, maxlength: 700 },
    openDate: { type: Date, default: null },
    deadline: { type: Date, default: null, index: true },
    source: { type: String, enum: ["MANUAL", "UNIVERSITY", "PROFESSOR", "ORGANIZATION", "CSV", "JSON"], default: "MANUAL" },
    sourceUrl: { type: String, required: true, trim: true, maxlength: 700 },
    retrievedAt: { type: Date, default: null },
    lastVerifiedAt: { type: Date, default: null },
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT", index: true }
  },
  { timestamps: true, versionKey: false, strict: "throw" }
);

opportunitySchema.index({ slug: 1 }, { unique: true });
opportunitySchema.index({ title: "text", organization: "text", fields: "text", researchAreas: "text", description: "text" });
opportunitySchema.index({ status: 1, type: 1, country: 1, deadline: 1 });
opportunitySchema.index({ status: 1, deadline: 1 });

export type OpportunityDocument = InferSchemaType<typeof opportunitySchema>;
export const Opportunity =
  (models.Opportunity as Model<OpportunityDocument> | undefined) ?? model<OpportunityDocument>("Opportunity", opportunitySchema);
