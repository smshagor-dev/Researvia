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
  confirmedAt: { type: Date, default: null },
  declinedAt: { type: Date, default: null },
  receivedAt: { type: Date, default: null },
  lastMessageId: { type: String, default: null, maxlength: 64 },
  portalTokenHash: { type: String, default: null, maxlength: 64, select: false },
  portalExpiresAt: { type: Date, default: null, index: true },
  portalLastAccessedAt: { type: Date, default: null },
  confidentialFileId: { type: Schema.Types.ObjectId, default: null, select: false },
  confidentialOriginalName: { type: String, default: "", maxlength: 255 },
  confidentialMimeType: { type: String, default: "", maxlength: 160 },
  confidentialSize: { type: Number, default: null, min: 1, max: 10485760 },
  refereeMessage: { type: String, default: "", maxlength: 8000 }
}, { timestamps: true, versionKey: false, strict: "throw" });
schema.index({ userId: 1, status: 1, deadline: 1 });
schema.index({ portalTokenHash: 1 }, { unique: true, partialFilterExpression: { portalTokenHash: { $type: "string" } } });
export type RecommendationRequestDocument = InferSchemaType<typeof schema>;
export const RecommendationRequest = (models.RecommendationRequest as Model<RecommendationRequestDocument> | undefined) ?? model<RecommendationRequestDocument>("RecommendationRequest", schema);
