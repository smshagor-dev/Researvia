import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  professorId: { type: Schema.Types.ObjectId, ref: "Professor", required: true, index: true },
  lastScore: { type: Number, required: true, min: 0, max: 100 },
  lastReasons: { type: [String], default: [] },
  firstMatchedAt: { type: Date, default: Date.now },
  lastMatchedAt: { type: Date, default: Date.now },
  lastNotifiedScore: { type: Number, default: null, min: 0, max: 100 },
  lastNotifiedAt: { type: Date, default: null },
  notificationCount: { type: Number, default: 0, min: 0 }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ userId: 1, professorId: 1 }, { unique: true });
schema.index({ userId: 1, lastScore: -1, lastMatchedAt: -1 });
export type ProfessorMatchAlertDocument = InferSchemaType<typeof schema>;
export const ProfessorMatchAlert = (models.ProfessorMatchAlert as Model<ProfessorMatchAlertDocument> | undefined) ?? model<ProfessorMatchAlertDocument>("ProfessorMatchAlert", schema);
