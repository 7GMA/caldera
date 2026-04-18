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

describe("hmac", () => {
  it("sign + verify round-trips", async () => {
    const { sign, verify } = await import("../../crypto/hmac.js");
    const sig = sign("test-data");
    expect(verify("test-data", sig)).toBe(true);
  });

  it("rejects tampered data", async () => {
    const { sign, verify } = await import("../../crypto/hmac.js");
    const sig = sign("test-data");
    expect(verify("tampered-data", sig)).toBe(false);
  });

  it("rejects tampered signature", async () => {
    const { sign, verify } = await import("../../crypto/hmac.js");
    const sig = sign("test-data");
    const tampered = sig.slice(0, -4) + "0000";
    expect(verify("test-data", tampered)).toBe(false);
  });
});
