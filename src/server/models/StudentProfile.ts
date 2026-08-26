import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const studentProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    fullName: { type: String, default: "", trim: true, maxlength: 220 },
    headline: { type: String, default: "", trim: true, maxlength: 240 },
    phone: { type: String, default: "", trim: true, maxlength: 80 },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, enum: ["", "MALE", "FEMALE", "NON_BINARY", "PREFER_NOT_TO_SAY", "OTHER"], default: "" },
    nationality: { type: String, default: "", trim: true, maxlength: 120 },
    country: { type: String, default: "", trim: true, maxlength: 120 },
    city: { type: String, default: "", trim: true, maxlength: 120 },
    photoFileId: { type: Schema.Types.ObjectId, default: null },
    photoMimeType: { type: String, default: "", trim: true, maxlength: 120 },
    photoOriginalName: { type: String, default: "", trim: true, maxlength: 255 },
    photoUpdatedAt: { type: Date, default: null },
    currentUniversity: { type: String, default: "", trim: true, maxlength: 180 },
    currentDegree: {
      type: String,
      enum: ["HIGH_SCHOOL", "BACHELORS", "MASTERS", "PHD", "OTHER"],
      default: null
    },
    fieldOfStudy: { type: String, default: "", trim: true, maxlength: 180 },
    graduationYear: { type: Number, default: null, min: 1950, max: 2100 },
    gpa: { type: String, default: "", trim: true, maxlength: 32 },
    bio: { type: String, default: "", trim: true, maxlength: 1200 },
    researchInterests: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    languages: { type: [String], default: [] },
    targetDegrees: {
      type: [{ type: String, enum: ["BACHELORS", "MASTERS", "PHD", "RESEARCH", "OTHER"] }],
      default: []
    },
    targetCountries: { type: [String], default: [] },
    fundingPreference: {
      type: String,
      enum: ["ANY", "FULLY_FUNDED", "FULL_OR_PARTIAL", "SELF_FUNDED"],
      default: "ANY"
    },
    preferredResearchAreas: { type: [String], default: [] },
    website: { type: String, default: "", trim: true, maxlength: 500 },
    linkedin: { type: String, default: "", trim: true, maxlength: 500 },
    github: { type: String, default: "", trim: true, maxlength: 500 },
    googleScholar: { type: String, default: "", trim: true, maxlength: 500 },
    orcid: { type: String, default: "", trim: true, maxlength: 500 },
    researchGate: { type: String, default: "", trim: true, maxlength: 500 },
    profileVisibility: {
      type: String,
      enum: ["PRIVATE", "RECOMMENDATION_ONLY"],
      default: "RECOMMENDATION_ONLY"
    },
    onboardingStep: { type: Number, default: 1, min: 1, max: 4 },
    onboardingCompletedAt: { type: Date, default: null }
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw"
  }
);

studentProfileSchema.index({ onboardingCompletedAt: 1 });
studentProfileSchema.index({ country: 1, fieldOfStudy: 1 });
studentProfileSchema.index({ nationality: 1, country: 1 });

export type StudentProfileDocument = InferSchemaType<typeof studentProfileSchema>;

export const StudentProfile =
  (models.StudentProfile as Model<StudentProfileDocument> | undefined) ??
  model<StudentProfileDocument>("StudentProfile", studentProfileSchema);
