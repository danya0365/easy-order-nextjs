import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt } from "./_shared";
import { shops } from "./shops";
import { branches } from "./branches";
import { customers } from "./customers";
import { loyaltyStampCards } from "./loyalty-stamp-cards";
import { loyaltyStampTypes } from "./loyalty-stamp-types";
import { users } from "./users";

/** History of every stamp-card reward redemption. */
export const loyaltyStampRedemptions = sqliteTable(
  "loyalty_stamp_redemptions",
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
    rewardTextSnapshot: text().notNull(),
    stampsSpent: integer().notNull(),
    performedBy: text()
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    index("loyalty_stamp_redemptions_shop_customer_idx").on(
      t.shopId,
      t.customerId,
    ),
    index("loyalty_stamp_redemptions_shop_created_idx").on(
      t.shopId,
      t.createdAt,
    ),
  ],
);
