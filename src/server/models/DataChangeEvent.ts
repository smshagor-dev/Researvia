import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const dataChangeEventSchema = new Schema({
  entityType: { type: String, enum: ["UNIVERSITY", "PROFESSOR", "SCHOLARSHIP", "OPPORTUNITY", "LAB", "PAPER"], required: true, index: true },
  entityId: { type: Schema.Types.ObjectId, required: true, index: true },
  field: { type: String, required: true, trim: true, maxlength: 100 },
  previousValue: { type: String, default: "", maxlength: 3000 },
  nextValue: { type: String, default: "", maxlength: 3000 },
  sourceUrl: { type: String, default: "", maxlength: 700 },
  verifiedAt: { type: Date, default: Date.now },
  actorType: { type: String, enum: ["SYSTEM", "ADMIN", "IMPORT"], default: "SYSTEM" }
}, { timestamps: true, versionKey: false, strict: "throw" });
dataChangeEventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export type DataChangeEventDocument = InferSchemaType<typeof dataChangeEventSchema>;
export const DataChangeEvent = (models.DataChangeEvent as Model<DataChangeEventDocument> | undefined) ?? model<DataChangeEventDocument>("DataChangeEvent", dataChangeEventSchema);
