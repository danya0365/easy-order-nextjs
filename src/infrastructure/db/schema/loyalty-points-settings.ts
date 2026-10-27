import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";

/**
 * Spend-points earn rate for a shop (1:1 with shops).
 *
 * Model: `satangPerPoint` — how many satang of order total = 1 point.
 * Example: 10000 → ฿100 spend earns 1 point (floor division).
 * Prefer this integer over a float points-per-baht rate.
 */
export const loyaltyPointsSettings = sqliteTable("loyalty_points_settings", {
  id: id(),
  shopId: text()
    .notNull()
    .unique()
    .references(() => shops.id, { onDelete: "cascade" }),
  /** Satang of spend required to earn 1 point (e.g. 10000 = ฿100 → 1 pt). */
  satangPerPoint: integer().notNull().default(10000),
  /** Optional minimum points balance required before a redeem is allowed. */
  minRedeemPoints: integer(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
