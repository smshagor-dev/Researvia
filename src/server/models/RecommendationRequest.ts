import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  refereeName: { type: String, required: true, trim: true, maxlength: 180 },
  refereeEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
  institution: { type: String, default: "", maxlength: 240 },
  refereeTitle: { type: String, default: "", maxlength: 180 },
  applicationName: { type: String, required: true, trim: true, maxlength: 300 },
  deadline: { type: Date, default: null, index: true },
  status: { type: String, enum: ["DRAFT","REQUESTED","CONFIRMED","RECEIVED","DECLINED","CANCELLED"], default: "DRAFT", index: true },
  notes: { type: String, default: "", maxlength: 8000 },
  reminderAt: { type: Date, default: null, index: true },
  studentReferenceId: { type: Schema.Types.ObjectId, default: null },
  requestedAt: { type: Date, default: null },
  receivedAt: { type: Date, default: null },
  lastMessageId: { type: String, default: null, maxlength: 64 }
}, { timestamps: true, versionKey: false, strict: "throw" });
schema.index({ userId: 1, status: 1, deadline: 1 });
export type RecommendationRequestDocument = InferSchemaType<typeof schema>;
export const RecommendationRequest = (models.RecommendationRequest as Model<RecommendationRequestDocument> | undefined) ?? model<RecommendationRequestDocument>("RecommendationRequest", schema);
