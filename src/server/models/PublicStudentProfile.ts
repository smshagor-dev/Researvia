import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const publicStudentProfileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
  enabled: { type: Boolean, default: false, index: true },
  headline: { type: String, default: "", maxlength: 240 },
  summary: { type: String, default: "", maxlength: 4000 },
  showInterests: { type: Boolean, default: true },
  showSkills: { type: Boolean, default: true },
  showPublications: { type: Boolean, default: true },
  showProjects: { type: Boolean, default: true },
  showAcademicLinks: { type: Boolean, default: true },
  allowCvDownload: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false, strict: "throw" });
publicStudentProfileSchema.index({ enabled: 1, slug: 1 });

export type PublicStudentProfileDocument = InferSchemaType<typeof publicStudentProfileSchema>;
export const PublicStudentProfile = (models.PublicStudentProfile as Model<PublicStudentProfileDocument> | undefined) ?? model<PublicStudentProfileDocument>("PublicStudentProfile", publicStudentProfileSchema);
