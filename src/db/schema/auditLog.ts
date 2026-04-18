import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { applications } from "./applications.js";

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    endUserId: text("end_user_id"),
    actor: text("actor"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_application_created_idx").on(t.applicationId, t.createdAt)],
);
