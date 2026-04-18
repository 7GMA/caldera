import { env } from "../../config/env.js";
import { sign, verify } from "../../crypto/hmac.js";
import { encrypt, decrypt } from "../../crypto/encryption.js";
import { randomBytes } from "node:crypto";

const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

export function buildAuthUrl(params: {
  applicationId: string;
  endUserId: string;
  redirectUri: string;
  nonce?: string;
}): string {
  const nonce = params.nonce ?? randomBytes(16).toString("hex");
  const statePayload = JSON.stringify({
    app: params.applicationId,
    user: params.endUserId,
    redirect: params.redirectUri,
    nonce,
    exp: Date.now() + 10 * 60 * 1000,
  });
  const state = Buffer.from(statePayload).toString("base64url") + "." + sign(statePayload);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", `${env.PUBLIC_BASE_URL}/v1/auth/google/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export function verifyState(state: string): {
  applicationId: string;
  endUserId: string;
  redirectUri: string;
} | null {
  const [payloadB64, sig] = state.split(".");
  if (!payloadB64 || !sig) return null;
  const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  if (!verify(payload, sig)) return null;
  const data = JSON.parse(payload) as { app: string; user: string; redirect: string; exp: number };
  if (Date.now() > data.exp) return null;
  return { applicationId: data.app, endUserId: data.user, redirectUri: data.redirect };
}

export async function exchangeCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
  scopes: string[];
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${env.PUBLIC_BASE_URL}/v1/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  };
  // fetch email from userinfo
  const info = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  }).then((r) => r.json()) as { email: string };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    email: info.email,
    scopes: data.scope.split(" "),
  };
}

export async function refreshAccessToken(encryptedRefreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
  newRefreshToken?: string;
}> {
  const refreshToken = decrypt(encryptedRefreshToken);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  const data = await res.json() as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    ...(data.refresh_token ? { newRefreshToken: data.refresh_token } : {}),
  };
}

export { encrypt };
