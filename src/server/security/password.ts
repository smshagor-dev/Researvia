import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 128) {
    throw new Error("Password must be between 12 and 128 characters");
  }

  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, saltEncoded, hashEncoded] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !saltEncoded || !hashEncoded) return false;

  try {
    const salt = Buffer.from(saltEncoded, "base64url");
    const storedHash = Buffer.from(hashEncoded, "base64url");
    if (storedHash.length !== KEY_LENGTH) return false;

    const candidate = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
    return timingSafeEqual(storedHash, candidate);
  } catch {
    return false;
  }
}
