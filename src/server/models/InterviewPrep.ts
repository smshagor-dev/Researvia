import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const interviewPrepSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 260 },
  professorId: { type: Schema.Types.ObjectId, ref: "Professor", default: null },
  universityId: { type: Schema.Types.ObjectId, ref: "University", default: null },
  applicationId: { type: Schema.Types.ObjectId, ref: "Application", default: null },
  researchDiscussionNotes: { type: String, default: "", maxlength: 12000 },
  universityNotes: { type: String, default: "", maxlength: 8000 },
  checklist: { type: [String], default: [] },
  questions: { type: [String], default: [] },
  mockAnswers: { type: [String], default: [] }
}, { timestamps: true, versionKey: false, strict: "throw" });
interviewPrepSchema.index({ userId: 1, updatedAt: -1 });

export type InterviewPrepDocument = InferSchemaType<typeof interviewPrepSchema>;
export const InterviewPrep = (models.InterviewPrep as Model<InterviewPrepDocument> | undefined) ?? model<InterviewPrepDocument>("InterviewPrep", interviewPrepSchema);
