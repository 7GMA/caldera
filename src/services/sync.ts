import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { calendarAccounts, syncState } from "../db/schema/index.js";
import { getProvider } from "../providers/registry.js";
import { buildProviderContext } from "./accounts.js";
import type { SyncResult } from "../providers/types.js";
import { v7 as uuidv7 } from "uuid";

export async function incrementalSync(
  accountId: string,
  calendarId: string,
  endUserId: string,
  cursor: string | null,
): Promise<SyncResult> {
  const [account] = await db
    .select({ provider: calendarAccounts.provider })
    .from(calendarAccounts)
    .where(and(eq(calendarAccounts.id, accountId), eq(calendarAccounts.endUserId, endUserId)))
    .limit(1);
  if (!account) throw Object.assign(new Error("Account not found"), { statusCode: 404 });

  // Prefer stored sync token if no cursor provided
  let resolvedCursor = cursor;
  if (!resolvedCursor) {
    const [state] = await db
      .select({ syncToken: syncState.syncToken })
      .from(syncState)
      .where(
        and(
          eq(syncState.calendarAccountId, accountId),
          eq(syncState.providerCalendarId, calendarId),
        ),
      )
      .limit(1);
    resolvedCursor = state?.syncToken ?? null;
  }

  const ctx = await buildProviderContext(accountId, endUserId);
  const provider = getProvider(account.provider);
  const result = await provider.incrementalSync(ctx, calendarId, resolvedCursor);

  // Persist next cursor as sync token
  if (result.nextCursor) {
    await db
      .insert(syncState)
      .values({
        id: uuidv7(),
        calendarAccountId: accountId,
        providerCalendarId: calendarId,
        syncToken: result.nextCursor,
        lastSyncAt: new Date(),
        nextSyncAt: new Date(),
      })
      .onConflictDoNothing();
    await db
      .update(syncState)
      .set({ syncToken: result.nextCursor, lastSyncAt: new Date() })
      .where(
        and(
          eq(syncState.calendarAccountId, accountId),
          eq(syncState.providerCalendarId, calendarId),
        ),
      );
  }

  return result;
}
