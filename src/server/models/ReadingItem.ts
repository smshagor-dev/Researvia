import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const readingItemSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  paperId: { type: Schema.Types.ObjectId, ref: "Paper", required: true, index: true },
  status: { type: String, enum: ["TO_READ", "READING", "READ", "ARCHIVED"], default: "TO_READ" },
  notes: { type: String, default: "", maxlength: 10000 },
  tags: { type: [String], default: [] },
  quotes: { type: [String], default: [] },
  mappedResearchInterests: { type: [String], default: [] }
}, { timestamps: true, versionKey: false, strict: "throw" });

readingItemSchema.index({ userId: 1, paperId: 1 }, { unique: true });
readingItemSchema.index({ userId: 1, status: 1, updatedAt: -1 });

export type ReadingItemDocument = InferSchemaType<typeof readingItemSchema>;
export const ReadingItem = (models.ReadingItem as Model<ReadingItemDocument> | undefined) ?? model<ReadingItemDocument>("ReadingItem", readingItemSchema);
