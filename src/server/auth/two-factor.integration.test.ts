import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/security/totp", () => ({
  generateTotpSecret: () => "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
  verifyTotp: (_secret: string, code: string) => code === "123456"
}));

import { beginTwoFactorSetup, completeTwoFactorLogin, createTwoFactorChallenge, disableTwoFactor, enableTwoFactor, getTwoFactorStatus } from "@/server/auth/two-factor.service";
import { connectDatabase, disconnectDatabase } from "@/server/db/mongoose";
import { TwoFactorChallenge } from "@/server/models/TwoFactorChallenge";
import { TwoFactorSecret } from "@/server/models/TwoFactorSecret";
import { User } from "@/server/models/User";
import { UserSession } from "@/server/models/UserSession";

beforeAll(async () => {
  process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27017/researvia_ci";
  process.env.APP_URL ||= "http://localhost:3000";
  process.env.SESSION_SECRET ||= "test-session-secret-value-at-least-32-characters";
  process.env.TOKEN_ENCRYPTION_KEY ||= "test-token-encryption-key-at-least-32-characters";
  await connectDatabase();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), UserSession.deleteMany({}), TwoFactorSecret.deleteMany({}), TwoFactorChallenge.deleteMany({})]);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe("two-factor lifecycle", () => {
  it("enables TOTP, consumes a recovery code once, and creates a session", async () => {
    const user = await User.create({ email: "twofactor@example.com", displayName: "Two Factor Student", passwordHash: "unused", role: "STUDENT", status: "ACTIVE", emailVerifiedAt: new Date() });
    const setup = await beginTwoFactorSetup(user._id.toString(), user.email);
    expect(setup.otpauthUrl).toContain("otpauth://totp/");
    const enabled = await enableTwoFactor(user._id.toString(), "123456");
    expect(enabled.recoveryCodes).toHaveLength(10);
    expect((await getTwoFactorStatus(user._id.toString())).enabled).toBe(true);

    const recoveryCode = enabled.recoveryCodes[0];
    expect(recoveryCode).toBeTruthy();
    const challenge = await createTwoFactorChallenge({ userId: user._id.toString(), rememberMe: false, ipAddress: "127.0.0.1", userAgent: "vitest" });
    const session = await completeTwoFactorLogin(challenge, recoveryCode as string);
    expect(session.token.length).toBeGreaterThan(32);
    expect(await UserSession.countDocuments({ userId: user._id, revokedAt: null })).toBe(1);

    const secondChallenge = await createTwoFactorChallenge({ userId: user._id.toString(), rememberMe: false, ipAddress: null, userAgent: null });
    await expect(completeTwoFactorLogin(secondChallenge, recoveryCode as string)).rejects.toMatchObject({ code: "INVALID_TWO_FACTOR_CODE" });
  });

  it("disables two-factor authentication only with a valid code", async () => {
    const user = await User.create({ email: "disable2fa@example.com", displayName: "Security Student", passwordHash: "unused", role: "STUDENT", status: "ACTIVE", emailVerifiedAt: new Date() });
    await beginTwoFactorSetup(user._id.toString(), user.email);
    await enableTwoFactor(user._id.toString(), "123456");
    await expect(disableTwoFactor(user._id.toString(), "000000")).rejects.toMatchObject({ code: "INVALID_TWO_FACTOR_CODE" });
    await disableTwoFactor(user._id.toString(), "123456");
    expect((await getTwoFactorStatus(user._id.toString())).enabled).toBe(false);
  });
});
