import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password security", () => {
  it("hashes and verifies a valid password", async () => {
    const password = "correct horse battery staple";
    const hash = await hashPassword(password);

    expect(hash).not.toContain(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password value", hash)).resolves.toBe(false);
  });

  it("rejects weak passwords at the hashing boundary", async () => {
    await expect(hashPassword("short")).rejects.toThrow();
  });
});
