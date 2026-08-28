import { createHash, randomBytes } from "node:crypto";
import { createSession } from "@/server/auth/session";
import { connectDatabase } from "@/server/db/mongoose";
import { AppError } from "@/server/errors/AppError";
import { TwoFactorChallenge } from "@/server/models/TwoFactorChallenge";
import { TwoFactorSecret } from "@/server/models/TwoFactorSecret";
import { User } from "@/server/models/User";
import { createOpaqueToken, hashOpaqueToken } from "@/server/security/opaque-token";
import { decryptSecret, encryptSecret } from "@/server/security/crypto-box";
import { generateTotpSecret, verifyTotp } from "@/server/security/totp";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const hashRecovery = (value: string) => createHash("sha256").update(value.trim().toUpperCase()).digest("hex");

function buildRecoveryCodes(): string[] {
  return Array.from({ length: 10 }, () => {
    const raw = randomBytes(5).toString("hex").toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export async function getTwoFactorStatus(userId: string) {
  await connectDatabase();
  const record = await TwoFactorSecret.findOne({ userId }).lean();
  return { enabled: Boolean(record?.enabledAt), enabledAt: record?.enabledAt ? new Date(record.enabledAt).toISOString() : null };
}

export async function beginTwoFactorSetup(userId: string, email: string) {
  await connectDatabase();
  const secret = generateTotpSecret();
  await TwoFactorSecret.findOneAndUpdate(
    { userId },
    { $set: { secretEnc: encryptSecret(secret), recoveryCodeHashes: [], enabledAt: null } },
    { upsert: true, returnDocument: "after", runValidators: true }
  );
  const issuer = "ResearVia";
  const label = `${issuer}:${email}`;
  return { secret, otpauthUrl: `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30` };
}

export async function enableTwoFactor(userId: string, code: string) {
  await connectDatabase();
  const record = await TwoFactorSecret.findOne({ userId }).select("+secretEnc +recoveryCodeHashes");
  if (!record) throw new AppError("TWO_FACTOR_SETUP_REQUIRED", 400, "Start two-factor setup first.");
  if (!verifyTotp(decryptSecret(record.secretEnc), code)) throw new AppError("INVALID_TWO_FACTOR_CODE", 400, "The authenticator code is invalid.");
  const recoveryCodes = buildRecoveryCodes();
  record.recoveryCodeHashes = recoveryCodes.map(hashRecovery);
  record.enabledAt = new Date();
  await record.save();
  return { recoveryCodes };
}

export async function disableTwoFactor(userId: string, code: string) {
  await connectDatabase();
  const record = await TwoFactorSecret.findOne({ userId, enabledAt: { $ne: null } }).select("+secretEnc +recoveryCodeHashes");
  if (!record) return;
  const validTotp = verifyTotp(decryptSecret(record.secretEnc), code);
  const recoveryIndex = record.recoveryCodeHashes.indexOf(hashRecovery(code));
  if (!validTotp && recoveryIndex < 0) throw new AppError("INVALID_TWO_FACTOR_CODE", 400, "The authenticator or recovery code is invalid.");
  await TwoFactorSecret.deleteOne({ _id: record._id });
}

export async function createTwoFactorChallenge(input: { userId: string; rememberMe: boolean; ipAddress: string | null; userAgent: string | null }) {
  await connectDatabase();
  const { token, tokenHash } = createOpaqueToken();
  await TwoFactorChallenge.create({ ...input, tokenHash, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) });
  return token;
}

export async function completeTwoFactorLogin(challengeToken: string, code: string) {
  await connectDatabase();
  const now = new Date();
  const challenge = await TwoFactorChallenge.findOne({ tokenHash: hashOpaqueToken(challengeToken), usedAt: null, expiresAt: { $gt: now } });
  if (!challenge) throw new AppError("INVALID_TWO_FACTOR_CHALLENGE", 400, "The sign-in challenge expired. Sign in again.");
  const record = await TwoFactorSecret.findOne({ userId: challenge.userId, enabledAt: { $ne: null } }).select("+secretEnc +recoveryCodeHashes");
  if (!record) throw new AppError("TWO_FACTOR_UNAVAILABLE", 400, "Two-factor authentication is unavailable for this account.");

  const validTotp = verifyTotp(decryptSecret(record.secretEnc), code);
  const recoveryHash = hashRecovery(code);
  const recoveryIndex = record.recoveryCodeHashes.indexOf(recoveryHash);
  if (!validTotp && recoveryIndex < 0) throw new AppError("INVALID_TWO_FACTOR_CODE", 401, "The authenticator or recovery code is invalid.");

  if (recoveryIndex >= 0) {
    record.recoveryCodeHashes.splice(recoveryIndex, 1);
    await record.save();
  }
  challenge.usedAt = now;
  await challenge.save();
  await User.updateOne({ _id: challenge.userId }, { $set: { lastLoginAt: now } });

  return createSession({
    userId: challenge.userId.toString(),
    rememberMe: challenge.rememberMe,
    ipAddress: challenge.ipAddress ?? null,
    userAgent: challenge.userAgent ?? null
  });
}
