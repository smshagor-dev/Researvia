import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const opportunityTypes = ["PHD", "MASTERS", "RESEARCH_ASSISTANT", "TEACHING_ASSISTANT", "RESEARCH_INTERNSHIP", "INDUSTRY_RESEARCH_INTERNSHIP", "FELLOWSHIP", "CONFERENCE", "WORKSHOP", "SUMMER_PROGRAM", "RESEARCH_PROJECT", "OTHER"] as const;

const schema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 180 },
  entityType: { type: String, enum: ["SCHOLARSHIP", "OPPORTUNITY"], required: true, index: true },
  format: { type: String, enum: ["AUTO", "JSON", "RSS", "ATOM"], default: "AUTO" },
  url: { type: String, required: true, trim: true, maxlength: 1000 },
  defaultCountry: { type: String, required: true, trim: true, maxlength: 120 },
  defaultProvider: { type: String, required: true, trim: true, maxlength: 220 },
  defaultOpportunityType: { type: String, enum: opportunityTypes, default: "OTHER" },
  active: { type: Boolean, default: true, index: true },
  lastSyncedAt: { type: Date, default: null },
  lastError: { type: String, default: null, maxlength: 1000 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ url: 1 }, { unique: true });
schema.index({ active: 1, entityType: 1, updatedAt: -1 });
export type AcademicFeedSourceDocument = InferSchemaType<typeof schema>;
export const AcademicFeedSource = (models.AcademicFeedSource as Model<AcademicFeedSourceDocument> | undefined) ?? model<AcademicFeedSourceDocument>("AcademicFeedSource", schema);
