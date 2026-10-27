import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";

/**
 * A stamp-card reward track a shop offers (Easy Stamp port). A shop has 1+
 * types; each has its own threshold + reward and is tracked separately per
 * customer via loyalty_stamp_balances. Exactly one isDefault type per shop.
 */
export const loyaltyStampTypes = sqliteTable(
  "loyalty_stamp_types",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text().notNull(),
    /** Stamps required to redeem one reward of this type. */
    threshold: integer().notNull().default(10),
    rewardText: text().notNull().default(""),
    /** Optional baht price this stamp maps to (label only), in satang. */
    priceSatang: integer(),
    isActive: integer({ mode: "boolean" }).notNull().default(true),
    isDefault: integer({ mode: "boolean" }).notNull().default(false),
    sortOrder: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("loyalty_stamp_types_shop_idx").on(t.shopId)],
);
