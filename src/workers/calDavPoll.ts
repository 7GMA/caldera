import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { calendarAccounts, syncState, endUsers } from "../db/schema/index.js";
import { fetchCTags } from "../providers/caldav/poll.js";
import { buildProviderContext } from "../services/accounts.js";
import { logger } from "../lib/logger.js";

export async function pollCalDAVAccounts(): Promise<void> {
  const accounts = await db
    .select()
    .from(calendarAccounts)
    .where(
      and(
        eq(calendarAccounts.status, "active"),
      ),
    );

  const calDavAccounts = accounts.filter(
    (a) => a.provider === "apple" || a.provider === "caldav_generic",
  );

  for (const account of calDavAccounts) {
    try {
      const [user] = await db
        .select({ id: endUsers.id })
        .from(endUsers)
        .where(eq(endUsers.id, account.endUserId))
        .limit(1);
      if (!user) continue;

      const ctx = await buildProviderContext(account.id, user.id);
      const currentCtags = await fetchCTags(ctx);

      for (const [calUrl, ctag] of Object.entries(currentCtags)) {
        const [state] = await db
          .select()
          .from(syncState)
          .where(
            and(
              eq(syncState.calendarAccountId, account.id),
              eq(syncState.providerCalendarId, calUrl),
            ),
          )
          .limit(1);

        const prevCtag = state?.syncToken ? JSON.parse(state.syncToken)?.ctag : undefined;

        if (ctag !== prevCtag) {
          logger.info({ accountId: account.id, calUrl }, "CalDAV ctag changed, sync needed");
          // Trigger incremental sync — in production this would enqueue a job
        }
      }
    } catch (err) {
      logger.error({ accountId: account.id, err }, "CalDAV poll failed");
    }
  }
}
