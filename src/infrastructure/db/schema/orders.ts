import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";
import { customers } from "./customers";
import { users } from "./users";

export const ORDER_STATUSES = [
  "pending",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;
export const ORDER_PAYMENT_METHODS = ["promptpay_qr", "cash"] as const;
export const ORDER_PAYMENT_STATUSES = ["unpaid", "paid"] as const;
/** Where the order originated: kiosk self-serve, counter staff, or online web. */
export const ORDER_CHANNELS = ["kiosk", "counter", "online"] as const;
export type OrderChannel = (typeof ORDER_CHANNELS)[number];
/** How the order reaches the customer. */
export const ORDER_FULFILLMENT_TYPES = ["pickup", "delivery", "dine_in"] as const;
export type FulfillmentType = (typeof ORDER_FULFILLMENT_TYPES)[number];

/** A customer order placed at a shop's kiosk, counter, or online. */
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
    /** Origin of the order — drives which guards set it (kiosk/counter/online). */
    channel: text({ enum: ORDER_CHANNELS }).notNull().default("kiosk"),
    /** Pickup / delivery / dine-in. */
    fulfillmentType: text({ enum: ORDER_FULFILLMENT_TYPES })
      .notNull()
      .default("pickup"),
    /** Drop-off address for delivery orders; null otherwise. */
    deliveryAddress: text(),
    subtotalSatang: integer().notNull(),
    totalSatang: integer().notNull(),
    note: text(),
    /**
     * Optional customer who placed the order (walk-ins stay null). Set-null on
     * customer delete so the order survives. name/phone are snapshotted so the
     * queue/history shows what was given even if the customer row changes/erases.
     */
    customerId: text().references(() => customers.id, { onDelete: "set null" }),
    customerName: text(),
    customerPhone: text(),
    /**
     * The operator (owner/staff) who placed this order from the counter UI.
     * Null for kiosk self-serve orders. Set-null on user delete so the order
     * survives. For staff accountability — also audit-logged at placement.
     */
    performedBy: text().references(() => users.id, { onDelete: "set null" }),
    paidAt: text(),
    readyAt: text(),
    completedAt: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_shop_created_idx").on(t.shopId, t.createdAt),
    index("orders_shop_status_idx").on(t.shopId, t.status),
    // Per-customer CRM aggregates / history.
    index("orders_shop_customer_idx").on(t.shopId, t.customerId, t.createdAt),
  ],
);
