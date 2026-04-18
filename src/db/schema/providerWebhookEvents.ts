import { pgTable, text, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

export const providerWebhookEvents = pgTable(
  "provider_webhook_events",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    providerChannelId: text("provider_channel_id").notNull(),
    messageId: text("message_id"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    payload: jsonb("payload"),
  },
  (t) => [
    uniqueIndex("provider_webhook_events_dedup_idx").on(
      t.provider,
      t.providerChannelId,
      t.messageId,
    ),
  ],
);
