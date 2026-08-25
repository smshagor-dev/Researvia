import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encodeBase32(input: Buffer): string {
  let bits = "";
  for (const byte of input) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let i = 0; i < bits.length; i += 5) {
    output += ALPHABET[Number.parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  }
  return output;
}

function decodeBase32(input: string): Buffer {
  let bits = "";
  for (const char of input.replace(/=+$/g, "").toUpperCase()) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) throw new Error("Invalid TOTP secret.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return encodeBase32(randomBytes(20));
}

function codeForCounter(secret: string, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function verifyTotp(secret: string, input: string, now = Date.now()): boolean {
  if (!/^\d{6}$/.test(input)) return false;
  const counter = Math.floor(now / 30_000);
  const candidate = Buffer.from(input);
  for (let delta = -1; delta <= 1; delta += 1) {
    const expected = Buffer.from(codeForCounter(secret, counter + delta));
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) return true;
  }
  return false;
}
