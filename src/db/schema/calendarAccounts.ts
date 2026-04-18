import {
  pgTable,
  text,
  timestamp,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { endUsers } from "./endUsers.js";

export const calendarAccounts = pgTable(
  "calendar_accounts",
  {
    id: text("id").primaryKey(),
    endUserId: text("end_user_id")
      .notNull()
      .references(() => endUsers.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // google|microsoft|apple|caldav_generic
    providerAccountId: text("provider_account_id"),
    email: text("email"),
    displayName: text("display_name"),
    accessTokenEnc: text("access_token_enc"), // AES-256-GCM base64
    refreshTokenEnc: text("refresh_token_enc"), // AES-256-GCM base64
    accessTokenExp: timestamp("access_token_exp", { withTimezone: true }),
    scopes: text("scopes").array().notNull().default([]),
    caldavServerUrl: text("caldav_server_url"),
    status: text("status").notNull().default("active"), // active|refresh_failed|revoked
    refreshFailCount: integer("refresh_fail_count").notNull().default(0),
    lastRefreshAt: timestamp("last_refresh_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("calendar_accounts_provider_account_idx").on(
      t.endUserId,
      t.provider,
      t.providerAccountId,
    ),
    index("calendar_accounts_status_exp_idx").on(t.status, t.accessTokenExp),
    index("calendar_accounts_provider_idx").on(t.provider),
  ],
);
