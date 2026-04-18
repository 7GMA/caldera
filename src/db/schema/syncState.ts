import { pgTable, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { calendarAccounts } from "./calendarAccounts.js";

export const syncState = pgTable(
  "sync_state",
  {
    id: text("id").primaryKey(),
    calendarAccountId: text("calendar_account_id")
      .notNull()
      .references(() => calendarAccounts.id, { onDelete: "cascade" }),
    providerCalendarId: text("provider_calendar_id").notNull(),
    syncToken: text("sync_token"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    nextSyncAt: timestamp("next_sync_at", { withTimezone: true }),
    failedAttempts: integer("failed_attempts").notNull().default(0),
  },
  (t) => [
    uniqueIndex("sync_state_account_calendar_idx").on(
      t.calendarAccountId,
      t.providerCalendarId,
    ),
  ],
);
