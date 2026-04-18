import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { applications } from "./applications.js";
import { endUsers } from "./endUsers.js";

export const outboundWebhooks = pgTable(
  "outbound_webhooks",
  {
    id: text("id").primaryKey(),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    endUserId: text("end_user_id").references(() => endUsers.id, { onDelete: "cascade" }),
    targetUrl: text("target_url").notNull(),
    eventTypes: text("event_types").array().notNull(),
    secret: text("secret").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    failCount: integer("fail_count").notNull().default(0),
  },
  (t) => [index("outbound_webhooks_application_idx").on(t.applicationId)],
);
