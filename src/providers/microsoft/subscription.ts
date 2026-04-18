import { randomBytes } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import type { ProviderContext, Watch, SubscribeOptions } from "../types.js";
import { graphFetch } from "./graphFetch.js";

export async function subscribeWatch(
  ctx: ProviderContext,
  _calendarId: string,
  opts: SubscribeOptions,
): Promise<Watch> {
  const secret = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days (MS max for /me/events)

  const res = await graphFetch<{ id: string; expirationDateTime: string }>(
    ctx,
    "/subscriptions",
    {
      method: "POST",
      body: JSON.stringify({
        changeType: "created,updated,deleted",
        notificationUrl: opts.notificationUrl,
        resource: "me/events",
        expirationDateTime: expiresAt.toISOString(),
        clientState: secret,
      }),
    },
  );

  return {
    id: uuidv4(),
    providerChannelId: res.id,
    secret,
    expiresAt: new Date(res.expirationDateTime),
  };
}

export async function renewWatch(ctx: ProviderContext, watch: Watch): Promise<Watch> {
  const newExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  await graphFetch<void>(ctx, `/subscriptions/${watch.providerChannelId}`, {
    method: "PATCH",
    body: JSON.stringify({ expirationDateTime: newExpiry.toISOString() }),
  });
  return { ...watch, expiresAt: newExpiry };
}

export async function unsubscribeWatch(ctx: ProviderContext, watch: Watch): Promise<void> {
  await graphFetch<void>(ctx, `/subscriptions/${watch.providerChannelId}`, { method: "DELETE" });
}
