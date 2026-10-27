import { sqliteTable, text, integer, unique, index } from "drizzle-orm/sqlite-core";
import { id, updatedAt } from "./_shared";
import { shops } from "./shops";
import { customers } from "./customers";

/** Points wallet per (shop, customer). */
export const loyaltyPointsBalances = sqliteTable(
  "loyalty_points_balances",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    customerId: text()
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    currentPoints: integer().notNull().default(0),
    lifetimeEarned: integer().notNull().default(0),
    lifetimeRedeemed: integer().notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("loyalty_points_balances_shop_customer_unique").on(
      t.shopId,
      t.customerId,
    ),
    index("loyalty_points_balances_shop_idx").on(t.shopId),
  ],
);
