import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt } from "./_shared";
import { shops } from "./shops";
import { customers } from "./customers";
import { orders } from "./orders";
import { loyaltyPointsRewards } from "./loyalty-points-rewards";
import { users } from "./users";

export const LOYALTY_POINTS_TX_TYPES = ["earn", "redeem"] as const;
export type LoyaltyPointsTxType = (typeof LOYALTY_POINTS_TX_TYPES)[number];

/** Immutable ledger of points movements. */
export const loyaltyPointsTransactions = sqliteTable(
  "loyalty_points_transactions",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    customerId: text()
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    type: text({ enum: LOYALTY_POINTS_TX_TYPES }).notNull(),
    /** +N for earn, −N for redeem. */
    quantity: integer().notNull(),
    /** Staff/owner who performed the action; null for system earn-from-order. */
    performedBy: text().references(() => users.id),
    orderId: text().references(() => orders.id, { onDelete: "set null" }),
    rewardId: text().references(() => loyaltyPointsRewards.id, {
      onDelete: "set null",
    }),
    note: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index("loyalty_points_tx_shop_customer_idx").on(t.shopId, t.customerId),
    index("loyalty_points_tx_shop_created_idx").on(t.shopId, t.createdAt),
    index("loyalty_points_tx_order_idx").on(t.orderId),
  ],
);
