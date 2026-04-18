import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const applications = pgTable("applications", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerEmail: text("owner_email").notNull(),
  rateLimitTier: text("rate_limit_tier").notNull().default("free"),
  webhookSecret: text("webhook_secret").notNull(),
  settings: jsonb("settings").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
