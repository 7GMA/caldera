import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

export function sign(data: string, secret?: string): string {
  return createHmac("sha256", secret ?? env.STATE_HMAC_SECRET)
    .update(data)
    .digest("hex");
}

export function verify(data: string, signature: string, secret?: string): boolean {
  const expected = sign(data, secret);
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}
