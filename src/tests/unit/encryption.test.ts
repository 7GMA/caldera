import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env["CALDERA_ENCRYPTION_KEY"] =
    "0000000000000000000000000000000000000000000000000000000000000000";
  process.env["STATE_HMAC_SECRET"] =
    "1111111111111111111111111111111111111111111111111111111111111111";
  process.env["DATABASE_URL"] = "postgresql://localhost/test";
  process.env["PUBLIC_BASE_URL"] = "http://localhost:3000";
  process.env["NODE_ENV"] = "test";
});

describe("encryption", () => {
  it("encrypts and decrypts a plaintext string", async () => {
    const { encrypt, decrypt } = await import("../../crypto/encryption.js");
    const plaintext = "super-secret-token";
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it("produces different ciphertext each call (random IV)", async () => {
    const { encrypt } = await import("../../crypto/encryption.js");
    const a = encrypt("same input");
    const b = encrypt("same input");
    expect(a).not.toBe(b);
  });

  it("throws on tampered ciphertext", async () => {
    const { encrypt, decrypt } = await import("../../crypto/encryption.js");
    const ciphertext = encrypt("value");
    const buf = Buffer.from(ciphertext, "base64");
    buf[buf.length - 1] ^= 0xff; // flip last byte
    expect(() => decrypt(buf.toString("base64"))).toThrow();
  });
});
