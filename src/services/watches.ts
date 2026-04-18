import { eq, and } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../db/client.js";
import { calendarAccounts, watches } from "../db/schema/index.js";
import { getProvider } from "../providers/registry.js";
import { buildProviderContext } from "./accounts.js";
import { env } from "../config/env.js";
import type { Watch } from "../providers/types.js";

export async function subscribeWatch(
  accountId: string,
  calendarId: string,
  endUserId: string,
): Promise<Watch> {
  const [account] = await db
    .select({ provider: calendarAccounts.provider })
    .from(calendarAccounts)
    .where(and(eq(calendarAccounts.id, accountId), eq(calendarAccounts.endUserId, endUserId)))
    .limit(1);
  if (!account) throw Object.assign(new Error("Account not found"), { statusCode: 404 });

  const provider = getProvider(account.provider);
  if (!provider.subscribeWatch) {
    throw Object.assign(new Error("Provider does not support push"), { statusCode: 400 });
  }

  const ctx = await buildProviderContext(accountId, endUserId);
  const notificationUrl = `${env.PUBLIC_BASE_URL}/internal/webhooks/${account.provider}`;
  const watch = await provider.subscribeWatch(ctx, calendarId, { notificationUrl });

  await db.insert(watches).values({
    id: uuidv7(),
    calendarAccountId: accountId,
    provider: account.provider,
    providerChannelId: watch.providerChannelId,
    providerResourceId: watch.providerResourceId,
    secret: watch.secret,
    expiresAt: watch.expiresAt,
  });

  return watch;
}

export async function unsubscribeWatch(watchId: string, endUserId: string): Promise<void> {
  const [row] = await db
    .select()
    .from(watches)
    .where(eq(watches.id, watchId))
    .limit(1);
  if (!row) return;

  const [account] = await db
    .select({ provider: calendarAccounts.provider })
    .from(calendarAccounts)
    .where(
      and(
        eq(calendarAccounts.id, row.calendarAccountId),
        eq(calendarAccounts.endUserId, endUserId),
      ),
    )
    .limit(1);
  if (!account) throw Object.assign(new Error("Not found"), { statusCode: 404 });

  const provider = getProvider(account.provider);
  if (provider.unsubscribeWatch) {
    const ctx = await buildProviderContext(row.calendarAccountId, endUserId);
    await provider.unsubscribeWatch(ctx, {
      id: row.id,
      providerChannelId: row.providerChannelId,
      providerResourceId: row.providerResourceId ?? undefined,
      secret: row.secret,
      expiresAt: row.expiresAt,
    });
  }

  await db.delete(watches).where(eq(watches.id, watchId));
}
