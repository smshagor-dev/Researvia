import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/email/mailer", () => ({
  assertEmailReady: vi.fn()
}));

vi.mock("@/server/email/auth-email", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn()
}));

import {
  loginStudent,
  registerStudent,
  requestPasswordReset,
  resetPassword,
  verifyEmailAddress
} from "@/server/auth/auth.service";
import { connectDatabase, disconnectDatabase } from "@/server/db/mongoose";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/server/email/auth-email";
import { EmailVerificationToken } from "@/server/models/EmailVerificationToken";
import { PasswordResetToken } from "@/server/models/PasswordResetToken";
import { RateLimitBucket } from "@/server/models/RateLimitBucket";
import { User } from "@/server/models/User";
import { UserSession } from "@/server/models/UserSession";

const fixturePrefix = "auth-lifecycle-";
let fixtureCounter = 0;

function nextAccount() {
  fixtureCounter += 1;
  return {
    displayName: "Test Student",
    email: `${fixturePrefix}${Date.now()}-${fixtureCounter}@example.com`,
    password: "initial-password-123"
  };
}

async function cleanupFixtures() {
  const users = await User.find({ email: { $regex: `^${fixturePrefix}` } }).select("_id").lean();
  const userIds = users.map((user) => user._id);
  if (!userIds.length) return;
  await Promise.all([
    UserSession.deleteMany({ userId: { $in: userIds } }),
    EmailVerificationToken.deleteMany({ userId: { $in: userIds } }),
    PasswordResetToken.deleteMany({ userId: { $in: userIds } }),
    RateLimitBucket.deleteMany({ key: { $regex: fixturePrefix } }),
    User.deleteMany({ _id: { $in: userIds } })
  ]);
}

async function registerAndVerify(account: ReturnType<typeof nextAccount>): Promise<void> {
  await registerStudent(account);
  const token = vi.mocked(sendVerificationEmail).mock.calls.at(-1)?.[2];
  expect(token).toBeTruthy();
  await verifyEmailAddress(token as string);
}

beforeAll(async () => {
  process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27017/researvia_ci";
  process.env.APP_URL ||= "http://localhost:3000";
  process.env.SESSION_SECRET ||= "test-session-secret-value-at-least-32-characters";
  process.env.TOKEN_ENCRYPTION_KEY ||= "test-token-encryption-key-at-least-32-characters";
  await connectDatabase();
  await cleanupFixtures();
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await cleanupFixtures();
  await disconnectDatabase();
});

describe("authentication lifecycle", () => {
  it("registers, requires verification, verifies once, and creates a session", async () => {
    const account = nextAccount();
    await registerStudent(account);

    const verificationCall = vi.mocked(sendVerificationEmail).mock.calls[0];
    expect(verificationCall?.[0]).toBe(account.email);
    const token = verificationCall?.[2];
    expect(token).toBeTruthy();

    const user = await User.findOne({ email: account.email }).select("_id").lean();
    expect(user?._id).toBeTruthy();
    const stored = await EmailVerificationToken.findOne({ userId: user?._id }).select("+tokenHash").lean();
    expect(stored?.tokenHash).toBeTruthy();
    expect(stored?.tokenHash).not.toBe(token);

    await expect(
      loginStudent(
        { email: account.email, password: account.password, rememberMe: false },
        { ipAddress: "127.0.0.1", userAgent: "vitest" }
      )
    ).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });

    await verifyEmailAddress(token as string);
    await expect(verifyEmailAddress(token as string)).rejects.toMatchObject({ code: "INVALID_VERIFICATION_TOKEN" });

    const session = await loginStudent(
      { email: account.email, password: account.password, rememberMe: false },
      { ipAddress: "127.0.0.1", userAgent: "vitest" }
    );

    expect(session.requiresTwoFactor).toBe(false);
    if (session.requiresTwoFactor) throw new Error("Unexpected two-factor challenge for account without 2FA.");
    expect(session.token.length).toBeGreaterThan(32);
    expect(await UserSession.countDocuments({ userId: user?._id, revokedAt: null })).toBe(1);
  });

  it("resets the password, consumes the token, and revokes existing sessions", async () => {
    const account = nextAccount();
    await registerAndVerify(account);
    const user = await User.findOne({ email: account.email }).select("_id").lean();
    expect(user?._id).toBeTruthy();

    await loginStudent(
      { email: account.email, password: account.password, rememberMe: true },
      { ipAddress: "127.0.0.1", userAgent: "vitest" }
    );

    await requestPasswordReset(account.email);
    const resetToken = vi.mocked(sendPasswordResetEmail).mock.calls.at(-1)?.[2];
    expect(resetToken).toBeTruthy();

    await resetPassword({ token: resetToken as string, password: "replacement-password-456" });

    expect(await UserSession.countDocuments({ userId: user?._id, revokedAt: null })).toBe(0);
    await expect(
      loginStudent(
        { email: account.email, password: account.password, rememberMe: false },
        { ipAddress: null, userAgent: null }
      )
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });

    const newLogin = await loginStudent(
      { email: account.email, password: "replacement-password-456", rememberMe: false },
      { ipAddress: null, userAgent: null }
    );
    expect(newLogin.requiresTwoFactor).toBe(false);
    if (newLogin.requiresTwoFactor) throw new Error("Unexpected two-factor challenge after password reset.");
    expect(newLogin).toMatchObject({ token: expect.any(String), expiresAt: expect.any(Date) });

    await expect(
      resetPassword({ token: resetToken as string, password: "another-password-789" })
    ).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
  });
});
