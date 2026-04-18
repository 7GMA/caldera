import { randomBytes } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import type { ProviderContext, Watch, SubscribeOptions } from "../types.js";
import { makeGoogleClient } from "./client.js";
import { withRetry } from "../../lib/retry.js";

export async function subscribeWatch(
  ctx: ProviderContext,
  calendarId: string,
  opts: SubscribeOptions,
): Promise<Watch> {
  const cal = makeGoogleClient(ctx);
  const channelId = uuidv4();
  const secret = randomBytes(32).toString("hex");
  const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

  const res = await withRetry(() =>
    cal.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: opts.notificationUrl,
        token: secret,
        expiration: String(expiration),
      },
    }),
  );

  return {
    id: uuidv4(),
    providerChannelId: channelId,
    providerResourceId: res.data.resourceId ?? undefined,
    secret,
    expiresAt: new Date(expiration),
  };
}

export async function unsubscribeWatch(ctx: ProviderContext, watch: Watch): Promise<void> {
  const cal = makeGoogleClient(ctx);
  await cal.channels.stop({
    requestBody: {
      id: watch.providerChannelId,
      resourceId: watch.providerResourceId,
    },
  }).catch(() => { /* best-effort */ });
}
