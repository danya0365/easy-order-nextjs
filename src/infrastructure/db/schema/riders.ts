import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";

export const RIDER_COMMISSION_TYPES = ["per_trip", "percent_fee", "full_fee"] as const;

/**
 * Shop-owned delivery riders. Per shop: the same person riding for two shops
 * is two rows. The rider opens a personal link `/r/<token>`; only the SHA-256
 * hash of the token is stored (regenerate = revoke old link).
 */
export const riders = sqliteTable(
  "riders",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text().notNull(),
    phone: text().notNull(),
    commissionType: text({ enum: RIDER_COMMISSION_TYPES }).notNull().default("per_trip"),
    /** satang for per_trip; percent (0–100) for percent_fee; ignored for full_fee. */
    commissionValue: integer().notNull().default(0),
    active: integer({ mode: "boolean" }).notNull().default(true),
    accessTokenHash: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("riders_shop_idx").on(t.shopId),
    uniqueIndex("riders_token_hash_unique").on(t.accessTokenHash),
  ],
);
