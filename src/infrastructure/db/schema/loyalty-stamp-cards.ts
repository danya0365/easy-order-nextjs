import { sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { id, updatedAt } from "./_shared";
import { shops } from "./shops";
import { customers } from "./customers";

/**
 * One loyalty stamp card per customer per shop — identity anchor only.
 * Live balances live in loyalty_stamp_balances (per stamp type).
 */
export const loyaltyStampCards = sqliteTable(
  "loyalty_stamp_cards",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    customerId: text()
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("loyalty_stamp_cards_shop_customer_unique").on(
      t.shopId,
      t.customerId,
    ),
  ],
);
