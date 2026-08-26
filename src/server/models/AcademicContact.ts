import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["PROFESSOR","REFEREE","UNIVERSITY","RECRUITER","COLLABORATOR","OTHER"], default: "OTHER", index: true },
  name: { type: String, required: true, trim: true, maxlength: 180 },
  email: { type: String, default: "", trim: true, lowercase: true, maxlength: 320 },
  phone: { type: String, default: "", maxlength: 80 },
  institution: { type: String, default: "", maxlength: 240 },
  department: { type: String, default: "", maxlength: 240 },
  title: { type: String, default: "", maxlength: 180 },
  website: { type: String, default: "", maxlength: 700 },
  relationshipStatus: { type: String, enum: ["NEW","CONTACTED","REPLIED","ACTIVE","INACTIVE"], default: "NEW", index: true },
  notes: { type: String, default: "", maxlength: 8000 },
  tags: { type: [String], default: [] },
  lastContactedAt: { type: Date, default: null },
  nextFollowUpAt: { type: Date, default: null, index: true },
  professorId: { type: Schema.Types.ObjectId, ref: "Professor", default: null }
}, { timestamps: true, versionKey: false, strict: "throw" });
schema.index({ userId: 1, updatedAt: -1 });
schema.index({ userId: 1, email: 1 });
export type AcademicContactDocument = InferSchemaType<typeof schema>;
export const AcademicContact = (models.AcademicContact as Model<AcademicContactDocument> | undefined) ?? model<AcademicContactDocument>("AcademicContact", schema);
