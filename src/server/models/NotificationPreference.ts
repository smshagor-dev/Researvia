import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  professorMatchWeb: { type: Boolean, default: true },
  professorMatchPush: { type: Boolean, default: true },
  minimumProfessorMatchScore: { type: Number, default: 55, min: 35, max: 95 }
}, { timestamps: true, versionKey: false, strict: "throw" });

export type NotificationPreferenceDocument = InferSchemaType<typeof schema>;
export const NotificationPreference = (models.NotificationPreference as Model<NotificationPreferenceDocument> | undefined) ?? model<NotificationPreferenceDocument>("NotificationPreference", schema);
