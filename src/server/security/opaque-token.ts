import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("base64url");
}

export function createOpaqueToken(): { token: string; tokenHash: string } {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: hashOpaqueToken(token) };
}
