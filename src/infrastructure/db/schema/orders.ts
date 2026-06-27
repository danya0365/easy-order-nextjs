import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";

export const ORDER_STATUSES = [
  "pending",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;
export const ORDER_PAYMENT_METHODS = ["promptpay_qr", "cash"] as const;
export const ORDER_PAYMENT_STATUSES = ["unpaid", "paid"] as const;

/** A customer order placed at a shop's kiosk. */
export const orders = sqliteTable(
  "orders",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    /** Per-shop daily running number, shown when calling the order. */
    orderNo: integer().notNull(),
    status: text({ enum: ORDER_STATUSES }).notNull().default("pending"),
    paymentMethod: text({ enum: ORDER_PAYMENT_METHODS }).notNull(),
    paymentStatus: text({ enum: ORDER_PAYMENT_STATUSES })
      .notNull()
      .default("unpaid"),
    subtotalSatang: integer().notNull(),
    totalSatang: integer().notNull(),
    note: text(),
    paidAt: text(),
    readyAt: text(),
    completedAt: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_shop_created_idx").on(t.shopId, t.createdAt),
    index("orders_shop_status_idx").on(t.shopId, t.status),
  ],
);
