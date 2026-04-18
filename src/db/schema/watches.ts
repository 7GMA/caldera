import { pgTable, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { calendarAccounts } from "./calendarAccounts.js";

export const watches = pgTable(
  "watches",
  {
    id: text("id").primaryKey(),
    calendarAccountId: text("calendar_account_id")
      .notNull()
      .references(() => calendarAccounts.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerChannelId: text("provider_channel_id").notNull(),
    providerResourceId: text("provider_resource_id"),
    // secret used as x-goog-channel-token (Google) and clientState (MS) — fixes Daily bug
    secret: text("secret").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    renewedAt: timestamp("renewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("watches_channel_id_idx").on(t.providerChannelId),
    index("watches_expires_at_idx").on(t.expiresAt),
  ],
);
