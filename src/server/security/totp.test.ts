import { describe, expect, it } from "vitest";
import { generateTotpSecret, verifyTotp } from "@/server/security/totp";

describe("TOTP", () => {
  it("validates the RFC 6238 SHA-1 vector truncated to six digits", () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    expect(verifyTotp(secret, "287082", 59_000)).toBe(true);
    expect(verifyTotp(secret, "287083", 59_000)).toBe(false);
  });

  it("accepts a one-step clock window and rejects malformed codes", () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    expect(verifyTotp(secret, "287082", 89_000)).toBe(true);
    expect(verifyTotp(secret, "12345", 59_000)).toBe(false);
    expect(verifyTotp(secret, "abcdef", 59_000)).toBe(false);
  });

  it("generates valid base32 secrets with adequate entropy", () => {
    const first = generateTotpSecret();
    const second = generateTotpSecret();
    expect(first).toMatch(/^[A-Z2-7]{32}$/);
    expect(second).toMatch(/^[A-Z2-7]{32}$/);
    expect(first).not.toBe(second);
  });
});
