import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const passwordResetTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null }
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw"
  }
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
passwordResetTokenSchema.index({ userId: 1, usedAt: 1 });

export type PasswordResetTokenDocument = InferSchemaType<typeof passwordResetTokenSchema>;

export const PasswordResetToken =
  (models.PasswordResetToken as Model<PasswordResetTokenDocument> | undefined) ??
  model<PasswordResetTokenDocument>("PasswordResetToken", passwordResetTokenSchema);
