import { pgTable, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { outboundWebhooks } from "./outboundWebhooks.js";

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: text("id").primaryKey(),
    outboundWebhookId: text("outbound_webhook_id")
      .notNull()
      .references(() => outboundWebhooks.id, { onDelete: "cascade" }),
    payload: jsonb("payload").notNull(),
    signature: text("signature").notNull(),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    status: text("status").notNull().default("pending"), // pending|delivered|failed|dead
    responseCode: integer("response_code"),
    responseBody: text("response_body"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (t) => [
    index("webhook_deliveries_status_next_idx").on(t.status, t.nextAttemptAt),
    index("webhook_deliveries_webhook_idx").on(t.outboundWebhookId),
  ],
);
