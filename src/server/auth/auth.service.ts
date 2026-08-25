import { connectDatabase } from "@/server/db/mongoose";
import { assertEmailReady } from "@/server/email/mailer";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/server/email/auth-email";
import { AppError } from "@/server/errors/AppError";
import { EmailVerificationToken } from "@/server/models/EmailVerificationToken";
import { PasswordResetToken } from "@/server/models/PasswordResetToken";
import { User } from "@/server/models/User";
import { UserSession } from "@/server/models/UserSession";
import { createOpaqueToken, hashOpaqueToken } from "@/server/security/opaque-token";
import { hashPassword, verifyPassword } from "@/server/security/password";
import { createSession } from "@/server/auth/session";
import type { LoginInput, RegisterInput, ResetPasswordInput } from "@/schemas/auth";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

export async function registerStudent(input: RegisterInput): Promise<{ email: string }> {
  assertEmailReady();
  await connectDatabase();

  const existing = await User.exists({ email: input.email, status: { $ne: "DELETED" } });
  if (existing) {
    throw new AppError("EMAIL_IN_USE", 409, "An account with this email already exists.");
  }

  const passwordHash = await hashPassword(input.password);
  let user;

  try {
    user = await User.create({
      email: input.email,
      displayName: input.displayName,
      passwordHash,
      role: "STUDENT",
      status: "ACTIVE",
      emailVerifiedAt: null
    });
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new AppError("EMAIL_IN_USE", 409, "An account with this email already exists.");
    }
    throw error;
  }

  const { token, tokenHash } = createOpaqueToken();
  await EmailVerificationToken.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + VERIFY_TTL_MS)
  });

  try {
    await sendVerificationEmail(user.email, user.displayName, token);
  } catch (error) {
    await Promise.allSettled([
      EmailVerificationToken.deleteMany({ userId: user._id }),
      User.deleteOne({ _id: user._id, emailVerifiedAt: null })
    ]);
    throw error;
  }

  return { email: user.email };
}

export async function verifyEmailAddress(token: string): Promise<void> {
  await connectDatabase();
  const now = new Date();
  const claimed = await EmailVerificationToken.findOneAndUpdate(
    { tokenHash: hashOpaqueToken(token), usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
    { new: true }
  ).lean();

  if (!claimed) {
    throw new AppError("INVALID_VERIFICATION_TOKEN", 400, "This verification link is invalid or has expired.");
  }

  await User.updateOne(
    { _id: claimed.userId, status: "ACTIVE", emailVerifiedAt: null },
    { $set: { emailVerifiedAt: now } }
  );
}

export async function resendVerificationEmail(email: string): Promise<void> {
  assertEmailReady();
  await connectDatabase();
  const user = await User.findOne({ email, status: "ACTIVE", emailVerifiedAt: null }).lean();
  if (!user) return;

  await EmailVerificationToken.deleteMany({ userId: user._id, usedAt: null });
  const { token, tokenHash } = createOpaqueToken();
  const record = await EmailVerificationToken.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + VERIFY_TTL_MS)
  });

  try {
    await sendVerificationEmail(user.email, user.displayName, token);
  } catch {
    await EmailVerificationToken.deleteOne({ _id: record._id });
  }
}

export async function loginStudent(
  input: LoginInput,
  metadata: { ipAddress: string | null; userAgent: string | null }
): Promise<{ token: string; expiresAt: Date }> {
  await connectDatabase();
  const user = await User.findOne({ email: input.email }).select("+passwordHash");

  if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError("INVALID_CREDENTIALS", 401, "Email or password is incorrect.");
  }

  if (user.status !== "ACTIVE") {
    throw new AppError("ACCOUNT_UNAVAILABLE", 403, "This account is not currently available.");
  }

  if (!user.emailVerifiedAt) {
    throw new AppError("EMAIL_NOT_VERIFIED", 403, "Verify your email address before signing in.");
  }

  user.lastLoginAt = new Date();
  await user.save();

  return createSession({
    userId: user._id.toString(),
    rememberMe: input.rememberMe,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  assertEmailReady();
  await connectDatabase();
  const user = await User.findOne({ email, status: "ACTIVE" }).lean();
  if (!user) return;

  await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });
  const { token, tokenHash } = createOpaqueToken();
  const record = await PasswordResetToken.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + RESET_TTL_MS)
  });

  try {
    await sendPasswordResetEmail(user.email, user.displayName, token);
  } catch {
    await PasswordResetToken.deleteOne({ _id: record._id });
  }
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  await connectDatabase();
  const now = new Date();
  const claimed = await PasswordResetToken.findOneAndUpdate(
    { tokenHash: hashOpaqueToken(input.token), usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
    { new: true }
  ).lean();

  if (!claimed) {
    throw new AppError("INVALID_RESET_TOKEN", 400, "This password reset link is invalid or has expired.");
  }

  const passwordHash = await hashPassword(input.password);
  const result = await User.updateOne(
    { _id: claimed.userId, status: "ACTIVE" },
    { $set: { passwordHash } }
  );

  if (result.matchedCount !== 1) {
    throw new AppError("ACCOUNT_UNAVAILABLE", 400, "The account for this reset link is unavailable.");
  }

  await Promise.all([
    UserSession.updateMany({ userId: claimed.userId, revokedAt: null }, { $set: { revokedAt: now } }),
    PasswordResetToken.deleteMany({ userId: claimed.userId, _id: { $ne: claimed._id } })
  ]);
}
