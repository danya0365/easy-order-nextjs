import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";
import { id, updatedAt } from "./_shared";
import { loyaltyStampCards } from "./loyalty-stamp-cards";
import { loyaltyStampTypes } from "./loyalty-stamp-types";

/**
 * A customer's running balance for ONE stamp type. eligibleToRedeem is derived
 * (currentStamps >= type.threshold), not stored.
 */
export const loyaltyStampBalances = sqliteTable(
  "loyalty_stamp_balances",
  {
    id: id(),
    cardId: text()
      .notNull()
      .references(() => loyaltyStampCards.id, { onDelete: "cascade" }),
    stampTypeId: text()
      .notNull()
      .references(() => loyaltyStampTypes.id, { onDelete: "cascade" }),
    currentStamps: integer().notNull().default(0),
    lifetimeStamps: integer().notNull().default(0),
    rewardsEarned: integer().notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("loyalty_stamp_balances_card_type_unique").on(
      t.cardId,
      t.stampTypeId,
    ),
  ],
);
