import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  provider: { type: String, enum: ["GOOGLE", "MICROSOFT"], required: true },
  stateHash: { type: String, required: true, unique: true, index: true },
  codeVerifierEnc: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true, index: true },
  usedAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export type OAuthStateDocument = InferSchemaType<typeof schema>;
export const OAuthState = (models.OAuthState as Model<OAuthStateDocument> | undefined) ?? model<OAuthStateDocument>("OAuthState", schema);
