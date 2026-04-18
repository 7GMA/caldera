import { env } from "../../config/env.js";
import { sign, verify } from "../../crypto/hmac.js";
import { decrypt } from "../../crypto/encryption.js";
import { randomBytes } from "node:crypto";

const SCOPES = "openid offline_access User.Read Calendars.ReadWrite";

export function buildAuthUrl(params: {
  applicationId: string;
  endUserId: string;
  redirectUri: string;
}): string {
  const nonce = randomBytes(16).toString("hex");
  const statePayload = JSON.stringify({
    app: params.applicationId,
    user: params.endUserId,
    redirect: params.redirectUri,
    nonce,
    exp: Date.now() + 10 * 60 * 1000,
  });
  const state = Buffer.from(statePayload).toString("base64url") + "." + sign(statePayload);
  const tenant = env.MICROSOFT_TENANT ?? "common";

  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", env.MICROSOFT_CLIENT_ID!);
  url.searchParams.set("redirect_uri", `${env.PUBLIC_BASE_URL}/v1/auth/microsoft/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
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
  const tenant = env.MICROSOFT_TENANT ?? "common";
  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.MICROSOFT_CLIENT_ID!,
        client_secret: env.MICROSOFT_CLIENT_SECRET!,
        redirect_uri: `${env.PUBLIC_BASE_URL}/v1/auth/microsoft/callback`,
        grant_type: "authorization_code",
        scope: SCOPES,
      }),
    },
  );
  if (!res.ok) throw new Error(`Microsoft token exchange failed: ${await res.text()}`);
  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  };

  const info = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  }).then((r) => r.json()) as { mail?: string; userPrincipalName?: string };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    email: info.mail ?? info.userPrincipalName ?? "",
    scopes: data.scope.split(" "),
  };
}

export async function refreshAccessToken(encryptedRefreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const refreshToken = decrypt(encryptedRefreshToken);
  const tenant = env.MICROSOFT_TENANT ?? "common";
  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: env.MICROSOFT_CLIENT_ID!,
        client_secret: env.MICROSOFT_CLIENT_SECRET!,
        grant_type: "refresh_token",
        scope: SCOPES,
      }),
    },
  );
  if (!res.ok) throw new Error(`Microsoft token refresh failed: ${await res.text()}`);
  const data = await res.json() as { access_token: string; expires_in: number };
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}
