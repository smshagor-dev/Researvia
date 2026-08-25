import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tool: { type: String, enum: ["RECOMMENDATIONS", "EMAIL", "SOP", "PROPOSAL"], required: true, index: true },
  mode: { type: String, enum: ["DETERMINISTIC", "AI"], required: true },
  provider: { type: String, default: "none", maxlength: 80 },
  status: { type: String, enum: ["COMPLETED", "FAILED"], required: true },
  errorCode: { type: String, default: null, maxlength: 120 }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ userId: 1, createdAt: -1 });
export type AIRequestDocument = InferSchemaType<typeof schema>;
export const AIRequest = (models.AIRequest as Model<AIRequestDocument> | undefined) ?? model<AIRequestDocument>("AIRequest", schema);
