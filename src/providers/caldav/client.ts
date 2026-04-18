import { DAVClient } from "tsdav";
import { decrypt } from "../../crypto/encryption.js";
import type { ProviderContext } from "../types.js";

export function makeCalDAVClient(ctx: ProviderContext): DAVClient {
  const password = decrypt(ctx.accessToken); // Apple: encrypted app-specific password
  return new DAVClient({
    serverUrl: ctx.caldavServerUrl ?? "https://caldav.icloud.com",
    credentials: {
      username: ctx.email ?? "",
      password,
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
}
