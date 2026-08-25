import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
    passwordHash: { type: String, select: false },
    displayName: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, enum: ["STUDENT", "ADMIN", "SUPER_ADMIN"], default: "STUDENT", index: true },
    emailVerifiedAt: { type: Date, default: null },
    status: { type: String, enum: ["ACTIVE", "SUSPENDED", "DELETED"], default: "ACTIVE", index: true },
    lastLoginAt: { type: Date, default: null }
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw"
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ status: 1, createdAt: -1 });

export type UserDocument = InferSchemaType<typeof userSchema>;

export const User = (models.User as Model<UserDocument> | undefined) ?? model<UserDocument>("User", userSchema);
