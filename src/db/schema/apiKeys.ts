import { pgTable, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { applications } from "./applications.js";

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull(), // sha256 hex of secret
    scopes: text("scopes").array().notNull().default([]),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    index("api_keys_application_idx").on(t.applicationId),
    uniqueIndex("api_keys_key_hash_idx").on(t.keyHash),
  ],
);
