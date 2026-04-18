import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { applications } from "./applications.js";

export const idempotencyKeys = pgTable("idempotency_keys", {
  key: text("key").primaryKey(),
  applicationId: text("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  requestHash: text("request_hash").notNull(), // sha256 hex
  responseStatus: integer("response_status"),
  responseBody: text("response_body"), // gzip+base64
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
