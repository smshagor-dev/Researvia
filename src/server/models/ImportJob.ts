import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  adminUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  entityType: { type: String, enum: ["UNIVERSITY", "PROFESSOR", "SCHOLARSHIP", "OPPORTUNITY"], required: true, index: true },
  format: { type: String, enum: ["CSV", "JSON", "OPENALEX"], required: true },
  status: { type: String, enum: ["PREVIEW", "QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"], default: "PREVIEW", index: true },
  totalRows: { type: Number, default: 0 },
  validRows: { type: Number, default: 0 },
  invalidRows: { type: Number, default: 0 },
  processedRows: { type: Number, default: 0 },
  failedRows: { type: Number, default: 0 },
  completedAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ adminUserId: 1, createdAt: -1 });
export type ImportJobDocument = InferSchemaType<typeof schema>;
export const ImportJob = (models.ImportJob as Model<ImportJobDocument> | undefined) ?? model<ImportJobDocument>("ImportJob", schema);
