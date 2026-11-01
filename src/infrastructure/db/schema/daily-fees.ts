import { sqliteTable, text, integer, index, unique } from "drizzle-orm/sqlite-core";
import { id, createdAt } from "./_shared";
import { shops } from "./shops";

/**
 * Append-only log of daily-fee terms. shopId null = platform terms; a shop row
 * only carries that shop's cutoff override (null = platform default). A
 * business day uses the versions effective at its START, so edits apply from
 * the next business day and past days never change.
 */
export const dailyFeeTerms = sqliteTable(
  "daily_fee_terms",
  {
    id: id(),
    shopId: text().references(() => shops.id, { onDelete: "cascade" }),
    effectiveAt: text().notNull(),
    enabled: integer({ mode: "boolean" }).notNull(),
    threshold: integer().notNull(),
    feeSatang: integer().notNull(),
    cutoffTime: text(),
    createdBy: text(),
    createdAt: createdAt(),
  },
  (t) => [index("daily_fee_terms_shop_idx").on(t.shopId, t.effectiveAt)],
);

/**
 * One row per (shop, business day), written lazily once the day has closed.
 * Snapshots the terms used so later settings changes never recompute it.
 * status: "none" (under threshold / disabled) | "due" | "paid".
 */
export const dailyFeeCharges = sqliteTable(
  "daily_fee_charges",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    businessDate: text().notNull(),
    periodStart: text().notNull(),
    periodEnd: text().notNull(),
    orderCount: integer().notNull(),
    enabled: integer({ mode: "boolean" }).notNull(),
    threshold: integer().notNull(),
    feeSatang: integer().notNull(),
    cutoffTime: text().notNull(),
    amountSatang: integer().notNull(),
    status: text({ enum: ["none", "due", "paid"] }).notNull(),
    paidAt: text(),
    paidBy: text(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("daily_fee_charges_shop_date_unique").on(t.shopId, t.businessDate),
    index("daily_fee_charges_shop_end_idx").on(t.shopId, t.periodEnd),
  ],
);
