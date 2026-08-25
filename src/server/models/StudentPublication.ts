import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const studentPublicationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 500 },
  doi: { type: String, default: "", lowercase: true, trim: true, maxlength: 300 },
  authors: { type: [String], default: [] },
  venue: { type: String, default: "", trim: true, maxlength: 300 },
  publicationDate: { type: Date, default: null },
  url: { type: String, default: "", trim: true, maxlength: 700 },
  source: { type: String, enum: ["MANUAL", "ORCID", "CROSSREF"], default: "MANUAL" },
  sourceId: { type: String, default: "", trim: true, maxlength: 300 },
  verified: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false, strict: "throw" });
studentPublicationSchema.index({ userId: 1, doi: 1 }, { unique: true, sparse: true });
studentPublicationSchema.index({ userId: 1, source: 1, sourceId: 1 }, { unique: true, sparse: true });

export type StudentPublicationDocument = InferSchemaType<typeof studentPublicationSchema>;
export const StudentPublication = (models.StudentPublication as Model<StudentPublicationDocument> | undefined) ?? model<StudentPublicationDocument>("StudentPublication", studentPublicationSchema);
