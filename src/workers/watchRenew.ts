import { lt, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { watches, calendarAccounts, endUsers } from "../db/schema/index.js";
import { getProvider } from "../providers/registry.js";
import { buildProviderContext } from "../services/accounts.js";
import { logger } from "../lib/logger.js";

export async function renewExpiringWatches(): Promise<void> {
  const horizon = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h ahead

  const expiringWatches = await db
    .select({
      watchId: watches.id,
      channelId: watches.providerChannelId,
      resourceId: watches.providerResourceId,
      secret: watches.secret,
      expiresAt: watches.expiresAt,
      provider: watches.provider,
      accountId: watches.calendarAccountId,
    })
    .from(watches)
    .where(lt(watches.expiresAt, horizon));

  for (const w of expiringWatches) {
    try {
      const [account] = await db
        .select({ endUserId: calendarAccounts.endUserId })
        .from(calendarAccounts)
        .where(eq(calendarAccounts.id, w.accountId))
        .limit(1);
      if (!account) continue;

      const [user] = await db
        .select({ id: endUsers.id })
        .from(endUsers)
        .where(eq(endUsers.id, account.endUserId))
        .limit(1);
      if (!user) continue;

      const provider = getProvider(w.provider);
      if (!provider.renewWatch) continue;

      const ctx = await buildProviderContext(w.accountId, user.id);
      const updated = await provider.renewWatch(ctx, {
        id: w.watchId,
        providerChannelId: w.channelId,
        providerResourceId: w.resourceId ?? undefined,
        secret: w.secret,
        expiresAt: w.expiresAt,
      });

      await db
        .update(watches)
        .set({
          providerChannelId: updated.providerChannelId,
          expiresAt: updated.expiresAt,
          renewedAt: new Date(),
        })
        .where(eq(watches.id, w.watchId));

      logger.info({ watchId: w.watchId }, "watch renewed");
    } catch (err) {
      logger.error({ watchId: w.watchId, err }, "watch renewal failed");
    }
  }
}
