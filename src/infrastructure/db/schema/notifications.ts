import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt } from "./_shared";
import { users } from "./users";

export const NOTIFICATION_TYPES = [
  "payment_submitted",
  "payment_approved",
  "payment_rejected",
  "contact_request",
  "contact_resolved",
  "new_order",
  "shop_received_review",
  "lead_follow_up_due",
  "security_alert",
] as const;

/** Per-recipient in-app notifications (operators only — customers are anonymous). */
export const notifications = sqliteTable(
  "notifications",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text({ enum: NOTIFICATION_TYPES }).notNull(),
    title: text().notNull(),
    body: text().notNull(),
    // Where the notification deep-links to (e.g. /admin/payments), or null.
    linkUrl: text(),
    isRead: integer({ mode: "boolean" }).notNull().default(false),
    readAt: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index("notifications_user_read_idx").on(t.userId, t.isRead),
    index("notifications_user_created_idx").on(t.userId, t.createdAt),
  ],
);
