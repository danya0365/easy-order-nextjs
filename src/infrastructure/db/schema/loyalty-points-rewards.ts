import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";

/** Redeem catalog for spend-points loyalty. */
export const loyaltyPointsRewards = sqliteTable(
  "loyalty_points_rewards",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text().notNull(),
    pointsCost: integer().notNull(),
    description: text(),
    isActive: integer({ mode: "boolean" }).notNull().default(true),
    sortOrder: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("loyalty_points_rewards_shop_idx").on(t.shopId)],
);
