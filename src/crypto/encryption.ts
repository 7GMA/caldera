import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_VERSION = 1;

function getKey(): Buffer {
  return Buffer.from(env.CALDERA_ENCRYPTION_KEY, "hex");
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: version(1) || iv(12) || tag(16) || ciphertext
  return Buffer.concat([Buffer.from([KEY_VERSION]), iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  // version byte is reserved for future key rotation
  const iv = buf.subarray(1, 1 + IV_LENGTH);
  const tag = buf.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + TAG_LENGTH);
  const encrypted = buf.subarray(1 + IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
