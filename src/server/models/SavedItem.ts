import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const savedItemSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    itemType: { type: String, enum: ["PROFESSOR", "UNIVERSITY", "SCHOLARSHIP", "OPPORTUNITY", "LAB", "PROGRAM"], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    targetSlug: { type: String, required: true, trim: true, maxlength: 320 },
    titleSnapshot: { type: String, required: true, trim: true, maxlength: 320 },
    subtitleSnapshot: { type: String, default: "", trim: true, maxlength: 320 },
    collection: { type: String, default: "Saved", trim: true, maxlength: 80 },
    notes: { type: String, default: "", trim: true, maxlength: 2000 },
    tags: { type: [String], default: [] }
  },
  { timestamps: true, versionKey: false, strict: "throw", suppressReservedKeysWarning: true }
);

savedItemSchema.index({ userId: 1, itemType: 1, targetId: 1 }, { unique: true });
savedItemSchema.index({ userId: 1, collection: 1, createdAt: -1 });
savedItemSchema.index({ userId: 1, itemType: 1, createdAt: -1 });

export type SavedItemDocument = InferSchemaType<typeof savedItemSchema>;
export const SavedItem = (models.SavedItem as Model<SavedItemDocument> | undefined) ?? model<SavedItemDocument>("SavedItem", savedItemSchema);
