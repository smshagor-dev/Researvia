import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  fileId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
  kind: {
    type: String,
    enum: [
      "CV",
      "TRANSCRIPT",
      "DEGREE_CERTIFICATE",
      "ENROLLMENT_CERTIFICATE",
      "RECOMMENDATION_LETTER",
      "MOTIVATION_LETTER",
      "SOP",
      "PROPOSAL",
      "LANGUAGE_CERTIFICATE",
      "COURSE_CERTIFICATE",
      "PUBLICATION",
      "PASSPORT",
      "OTHER"
    ],
    default: "OTHER",
    index: true
  },
  originalName: { type: String, required: true, maxlength: 255 },
  mimeType: { type: String, required: true, maxlength: 160 },
  size: { type: Number, required: true, min: 1, max: 10485760 }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ userId: 1, createdAt: -1 });
export type StudentDocumentDocument = InferSchemaType<typeof schema>;
export const StudentDocument = (models.StudentDocument as Model<StudentDocumentDocument> | undefined) ?? model<StudentDocumentDocument>("StudentDocument", schema);
