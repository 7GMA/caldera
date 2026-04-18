import { eq, and } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../db/client.js";
import { calendars, calendarAccounts } from "../db/schema/index.js";
import { getProvider } from "../providers/registry.js";
import { buildProviderContext } from "./accounts.js";
import type { UnifiedCalendar } from "../providers/types.js";

export async function listCalendars(
  accountId: string,
  endUserId: string,
): Promise<UnifiedCalendar[]> {
  const [account] = await db
    .select({ provider: calendarAccounts.provider })
    .from(calendarAccounts)
    .where(and(eq(calendarAccounts.id, accountId), eq(calendarAccounts.endUserId, endUserId)))
    .limit(1);
  if (!account) throw Object.assign(new Error("Account not found"), { statusCode: 404 });

  const ctx = await buildProviderContext(accountId, endUserId);
  const provider = getProvider(account.provider);
  const cals = await provider.listCalendars(ctx);

  // Upsert into local cache
  for (const cal of cals) {
    await db
      .insert(calendars)
      .values({
        id: uuidv7(),
        calendarAccountId: accountId,
        providerCalendarId: cal.providerCalendarId,
        name: cal.name,
        color: cal.color,
        isPrimary: cal.isPrimary,
        readOnly: cal.readOnly,
        timezone: cal.timezone,
      })
      .onConflictDoNothing();
  }

  return cals;
}

export async function getCalendar(
  accountId: string,
  calendarId: string,
  endUserId: string,
): Promise<UnifiedCalendar> {
  const [account] = await db
    .select({ provider: calendarAccounts.provider })
    .from(calendarAccounts)
    .where(and(eq(calendarAccounts.id, accountId), eq(calendarAccounts.endUserId, endUserId)))
    .limit(1);
  if (!account) throw Object.assign(new Error("Account not found"), { statusCode: 404 });

  const ctx = await buildProviderContext(accountId, endUserId);
  const provider = getProvider(account.provider);
  return provider.getCalendar(ctx, calendarId);
}
