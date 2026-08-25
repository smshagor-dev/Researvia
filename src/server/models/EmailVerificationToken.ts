import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const emailVerificationTokenSchema = new Schema(
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

emailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
emailVerificationTokenSchema.index({ userId: 1, usedAt: 1 });

export type EmailVerificationTokenDocument = InferSchemaType<typeof emailVerificationTokenSchema>;

export const EmailVerificationToken =
  (models.EmailVerificationToken as Model<EmailVerificationTokenDocument> | undefined) ??
  model<EmailVerificationTokenDocument>("EmailVerificationToken", emailVerificationTokenSchema);
