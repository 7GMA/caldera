import { pgTable, text, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { applications } from "./applications.js";

export const endUsers = pgTable(
  "end_users",
  {
    id: text("id").primaryKey(),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    email: text("email"),
    displayName: text("display_name"),
    metadata: jsonb("metadata").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("end_users_application_external_idx").on(t.applicationId, t.externalId),
    index("end_users_application_email_idx").on(t.applicationId, t.email),
  ],
);
