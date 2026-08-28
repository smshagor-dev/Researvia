import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  rememberMe: { type: Boolean, default: false },
  ipAddress: { type: String, default: null, maxlength: 64 },
  userAgent: { type: String, default: null, maxlength: 512 },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export type TwoFactorChallengeDocument = InferSchemaType<typeof schema>;
export const TwoFactorChallenge = (models.TwoFactorChallenge as Model<TwoFactorChallengeDocument> | undefined) ?? model<TwoFactorChallengeDocument>("TwoFactorChallenge", schema);
