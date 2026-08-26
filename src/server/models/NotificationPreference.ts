import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  professorMatchWeb: { type: Boolean, default: true },
  professorMatchPush: { type: Boolean, default: true },
  minimumProfessorMatchScore: { type: Number, default: 55, min: 35, max: 95 },
  scholarshipMatchWeb: { type: Boolean, default: true },
  scholarshipMatchPush: { type: Boolean, default: true },
  minimumScholarshipMatchScore: { type: Number, default: 60, min: 35, max: 95 },
  opportunityMatchWeb: { type: Boolean, default: true },
  opportunityMatchPush: { type: Boolean, default: true },
  minimumOpportunityMatchScore: { type: Number, default: 60, min: 35, max: 95 },
  labMatchWeb: { type: Boolean, default: true },
  labMatchPush: { type: Boolean, default: true },
  minimumLabMatchScore: { type: Number, default: 60, min: 35, max: 95 },
  programMatchWeb: { type: Boolean, default: true },
  programMatchPush: { type: Boolean, default: true },
  minimumProgramMatchScore: { type: Number, default: 60, min: 35, max: 95 }
}, { timestamps: true, versionKey: false, strict: "throw" });

export type NotificationPreferenceDocument = InferSchemaType<typeof schema>;
export const NotificationPreference = (models.NotificationPreference as Model<NotificationPreferenceDocument> | undefined) ?? model<NotificationPreferenceDocument>("NotificationPreference", schema);
