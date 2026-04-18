import { pgTable, text, timestamp, jsonb, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { calendarAccounts } from "./calendarAccounts.js";

export const calendars = pgTable(
  "calendars",
  {
    id: text("id").primaryKey(),
    calendarAccountId: text("calendar_account_id")
      .notNull()
      .references(() => calendarAccounts.id, { onDelete: "cascade" }),
    providerCalendarId: text("provider_calendar_id").notNull(),
    name: text("name"),
    color: text("color"),
    isPrimary: boolean("is_primary").notNull().default(false),
    readOnly: boolean("read_only").notNull().default(false),
    timezone: text("timezone"),
    raw: jsonb("raw").notNull().default("{}"),
    etag: text("etag"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("calendars_account_provider_idx").on(
      t.calendarAccountId,
      t.providerCalendarId,
    ),
  ],
);
