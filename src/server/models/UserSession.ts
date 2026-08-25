import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const userSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true, default: Date.now },
    revokedAt: { type: Date, default: null },
    ipAddress: { type: String, default: null, maxlength: 64 },
    userAgent: { type: String, default: null, maxlength: 512 }
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw"
  }
);

userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
userSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });

export type UserSessionDocument = InferSchemaType<typeof userSessionSchema>;

export const UserSession =
  (models.UserSession as Model<UserSessionDocument> | undefined) ??
  model<UserSessionDocument>("UserSession", userSessionSchema);
