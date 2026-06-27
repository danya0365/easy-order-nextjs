import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "suspended",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * One subscription per shop. The stored `status` is a convenience cache;
 * the source of truth for enforcement is `currentPeriodDueAt` (the shop's
 * expiry / paid-through date) vs now, computed by subscription-status.ts.
 *
 * Prepaid "day top-up" model: topping up extends `currentPeriodDueAt`. Custom
 * top-ups are priced from `pricePerDaySatang`; presets carry their own price.
 */
export const subscriptions = sqliteTable("subscriptions", {
  id: id(),
  shopId: text()
    .notNull()
    .unique()
    .references(() => shops.id, { onDelete: "cascade" }),
  status: text({ enum: SUBSCRIPTION_STATUSES }).notNull().default("trialing"),
  // Per-day rate for custom top-ups, in satang (THB cents). ฿10/วัน default.
  pricePerDaySatang: integer().notNull().default(1000),
  // Vestigial: the old fixed monthly price. Kept for back-compat; unused going
  // forward (SQLite column drops are painful — remove in a later migration).
  amountSatang: integer().notNull().default(0),
  currentPeriodStartAt: text().notNull(),
  // The expiry date that dunning/suspension is computed from.
  currentPeriodDueAt: text().notNull(),
  // When set, the shop is temporarily paused (closed): the billing clock is
  // frozen — no day is consumed. On resume, currentPeriodDueAt is pushed forward
  // by the paused duration. Null = running normally.
  pausedAt: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
