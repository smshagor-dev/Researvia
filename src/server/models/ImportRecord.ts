import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  importJobId: { type: Schema.Types.ObjectId, ref: "ImportJob", required: true, index: true },
  rowNumber: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ["VALID", "INVALID", "IMPORTED", "FAILED"], required: true, index: true },
  rawData: { type: Schema.Types.Mixed, required: true },
  normalizedData: { type: Schema.Types.Mixed, default: null },
  errors: { type: [String], default: [] },
  targetId: { type: String, default: null, maxlength: 160 }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ importJobId: 1, rowNumber: 1 }, { unique: true });
export type ImportRecordDocument = InferSchemaType<typeof schema>;
export const ImportRecord = (models.ImportRecord as Model<ImportRecordDocument> | undefined) ?? model<ImportRecordDocument>("ImportRecord", schema);
