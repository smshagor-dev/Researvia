import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  secretEnc: { type: String, required: true, select: false },
  recoveryCodeHashes: { type: [String], default: [], select: false },
  enabledAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false, strict: "throw" });

export type TwoFactorSecretDocument = InferSchemaType<typeof schema>;
export const TwoFactorSecret = (models.TwoFactorSecret as Model<TwoFactorSecretDocument> | undefined) ?? model<TwoFactorSecretDocument>("TwoFactorSecret", schema);
