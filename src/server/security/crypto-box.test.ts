import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/server/security/crypto-box";

describe("encrypted secret storage", () => {
  it("round-trips provider and TOTP secrets without exposing plaintext", () => {
    const plaintext = "sensitive-refresh-token-value";
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(encrypted.split(".")).toHaveLength(3);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it("rejects malformed encrypted payloads", () => {
    expect(() => decryptSecret("not-a-valid-payload")).toThrow("Invalid encrypted payload");
  });
});
