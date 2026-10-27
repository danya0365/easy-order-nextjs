import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt } from "./_shared";
import { shops } from "./shops";
import { branches } from "./branches";
import { customers } from "./customers";
import { loyaltyStampCards } from "./loyalty-stamp-cards";
import { loyaltyStampTypes } from "./loyalty-stamp-types";
import { users } from "./users";

export const LOYALTY_STAMP_TX_TYPES = ["earn", "redeem_adjust"] as const;
export type LoyaltyStampTxType = (typeof LOYALTY_STAMP_TX_TYPES)[number];

/** Immutable ledger of every stamp movement. */
export const loyaltyStampTransactions = sqliteTable(
  "loyalty_stamp_transactions",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    branchId: text().references(() => branches.id, { onDelete: "set null" }),
    customerId: text()
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    cardId: text()
      .notNull()
      .references(() => loyaltyStampCards.id, { onDelete: "cascade" }),
    stampTypeId: text().references(() => loyaltyStampTypes.id, {
      onDelete: "set null",
    }),
    type: text({ enum: LOYALTY_STAMP_TX_TYPES }).notNull(),
    /** +N for earn, negative (−threshold) for redemption decrement. */
    quantity: integer().notNull(),
    performedBy: text()
      .notNull()
      .references(() => users.id),
    note: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index("loyalty_stamp_tx_shop_customer_idx").on(t.shopId, t.customerId),
    index("loyalty_stamp_tx_card_idx").on(t.cardId),
    index("loyalty_stamp_tx_shop_created_idx").on(t.shopId, t.createdAt),
  ],
);
