import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const studentPublicationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 500 },
  publicationType: { type: String, enum: ["JOURNAL", "CONFERENCE", "WORKSHOP", "BOOK_CHAPTER", "PREPRINT", "THESIS", "OTHER"], default: "OTHER" },
  doi: { type: String, default: "", lowercase: true, trim: true, maxlength: 300 },
  authors: { type: [String], default: [] },
  authorPosition: { type: String, default: "", trim: true, maxlength: 80 },
  venue: { type: String, default: "", trim: true, maxlength: 300 },
  publisher: { type: String, default: "", trim: true, maxlength: 300 },
  publicationDate: { type: Date, default: null },
  url: { type: String, default: "", trim: true, maxlength: 700 },
  volume: { type: String, default: "", trim: true, maxlength: 80 },
  issue: { type: String, default: "", trim: true, maxlength: 80 },
  pages: { type: String, default: "", trim: true, maxlength: 80 },
  citationCount: { type: Number, default: null, min: 0 },
  status: { type: String, enum: ["PUBLISHED", "ACCEPTED", "UNDER_REVIEW", "SUBMITTED", "PREPRINT", "IN_PREPARATION"], default: "PUBLISHED" },
  abstract: { type: String, default: "", trim: true, maxlength: 6000 },
  source: { type: String, enum: ["MANUAL", "ORCID", "CROSSREF"], default: "MANUAL" },
  sourceId: { type: String, default: "", trim: true, maxlength: 300 },
  verified: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false, strict: "throw" });
studentPublicationSchema.index({ userId: 1, doi: 1 });
studentPublicationSchema.index({ userId: 1, source: 1, sourceId: 1 });
studentPublicationSchema.index({ userId: 1, publicationDate: -1 });
studentPublicationSchema.index({ userId: 1, status: 1 });

export type StudentPublicationDocument = InferSchemaType<typeof studentPublicationSchema>;
export const StudentPublication = (models.StudentPublication as Model<StudentPublicationDocument> | undefined) ?? model<StudentPublicationDocument>("StudentPublication", studentPublicationSchema);
