import { describe, expect, it } from "vitest";
import { createOpaqueToken, hashOpaqueToken } from "./opaque-token";

describe("opaque tokens", () => {
  it("returns a random token and only a deterministic hash for storage", () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashOpaqueToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
  });
});
