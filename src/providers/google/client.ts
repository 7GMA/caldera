import { google } from "googleapis";
import { decrypt } from "../../crypto/encryption.js";
import type { ProviderContext } from "../types.js";

export function makeGoogleClient(ctx: ProviderContext) {
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: decrypt(ctx.accessToken) });
  return google.calendar({ version: "v3", auth: oauth2 });
}
