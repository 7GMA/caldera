import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { calendarAccounts } from "../db/schema/index.js";
import { getProvider } from "../providers/registry.js";
import { buildProviderContext } from "./accounts.js";
import type { FreeBusy } from "../providers/types.js";

export interface FreeBusyRequest {
  calendars: Array<{ accountId: string; calendarId: string }>;
  from: string;
  to: string;
}

export async function getFreeBusy(
  endUserId: string,
  req: FreeBusyRequest,
): Promise<FreeBusy[]> {
  // Group calendar IDs by account
  const byAccount = new Map<string, string[]>();
  for (const { accountId, calendarId } of req.calendars) {
    const arr = byAccount.get(accountId) ?? [];
    arr.push(calendarId);
    byAccount.set(accountId, arr);
  }

  const results: FreeBusy[] = [];

  for (const [accountId, calIds] of byAccount) {
    const [account] = await db
      .select({ provider: calendarAccounts.provider })
      .from(calendarAccounts)
      .where(
        and(
          eq(calendarAccounts.id, accountId),
          eq(calendarAccounts.endUserId, endUserId),
        ),
      )
      .limit(1);
    if (!account) continue;

    const ctx = await buildProviderContext(accountId, endUserId);
    const provider = getProvider(account.provider);
    const fb = await provider.freeBusy(ctx, calIds, req.from, req.to);
    results.push(...fb);
  }

  return results;
}
