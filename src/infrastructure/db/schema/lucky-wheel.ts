import { sqliteTable, text, integer, index, unique } from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";
import { customers } from "./customers";
import { orders } from "./orders";
import { menuItems } from "./menu-items";
import { users } from "./users";
import { branches } from "./branches";

/**
 * Lucky wheel (หมุนวงล้อ) — phase 1. One campaign row per shop holds the shop
 * switch + earning rules; prizes hang off it. Coupon prize types exist in the
 * enum for phase 2 but are rejected/hidden by the app until then.
 */
export const SPIN_PRIZE_TYPES = [
  "points",
  "free_item",
  "gift",
  "thanks",
  "coupon_percent",
  "coupon_amount",
] as const;
export type SpinPrizeType = (typeof SPIN_PRIZE_TYPES)[number];

export const spinCampaigns = sqliteTable(
  "spin_campaigns",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text().notNull().default("หมุนวงล้อลุ้นรางวัล"),
    /** Per-shop switch (platform switch must also be on). */
    isActive: integer({ mode: "boolean" }).notNull().default(false),
    /** Orders below this total earn no ticket (satang). */
    minOrderSatang: integer().notNull().default(0),
    /** Tickets granted per eligible order. */
    ticketsPerOrder: integer().notNull().default(1),
    /** Monthly free spin for every member in the last N days of the month. */
    monthlyFreeEnabled: integer({ mode: "boolean" }).notNull().default(false),
    monthlyWindowDays: integer().notNull().default(3),
    /** Days a won free-item / gift reward stays redeemable. */
    rewardExpiryDays: integer().notNull().default(30),
    /** Extra rules shown to customers (free text). */
    rulesText: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("spin_campaigns_shop_unique").on(t.shopId)],
);

export const spinPrizes = sqliteTable(
  "spin_prizes",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    campaignId: text()
      .notNull()
      .references(() => spinCampaigns.id, { onDelete: "cascade" }),
    type: text({ enum: SPIN_PRIZE_TYPES }).notNull(),
    name: text().notNull(),
    /** Relative odds (≥1). Probability = weight / Σ eligible weights. */
    weight: integer().notNull().default(1),
    /** Remaining stock; null = unlimited. Out of stock → excluded from the draw. */
    stock: integer(),
    /** Max wins per Bangkok day; null = no cap. */
    dailyCap: integer(),
    /** points prize: points credited to the loyalty ledger. */
    pointsAmount: integer(),
    /** free_item prize: the menu item given. */
    menuItemId: text().references(() => menuItems.id, { onDelete: "set null" }),
    /** Owner's cost estimate per win (satang) — for the report only. */
    costSatang: integer().notNull().default(0),
    isActive: integer({ mode: "boolean" }).notNull().default(true),
    sortOrder: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("spin_prizes_shop_idx").on(t.shopId)],
);

export const SPIN_TICKET_SOURCES = ["order", "monthly", "kiosk_claim"] as const;
export const SPIN_TICKET_STATUSES = ["available", "used", "revoked"] as const;

/** One ticket = one spin. `sourceKey` (unique per shop) makes every grant idempotent. */
export const spinTickets = sqliteTable(
  "spin_tickets",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    customerId: text()
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    source: text({ enum: SPIN_TICKET_SOURCES }).notNull(),
    /** e.g. "order:<orderId>:1", "monthly:2026-11". */
    sourceKey: text().notNull(),
    orderId: text().references(() => orders.id, { onDelete: "set null" }),
    status: text({ enum: SPIN_TICKET_STATUSES }).notNull().default("available"),
    expiresAt: text(),
    usedAt: text(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("spin_tickets_shop_source_unique").on(t.shopId, t.sourceKey),
    index("spin_tickets_customer_idx").on(t.shopId, t.customerId, t.status),
    index("spin_tickets_order_idx").on(t.orderId),
  ],
);

export const SPIN_REWARD_STATUSES = ["none", "pending", "redeemed"] as const;

/** A spin outcome (prize snapshot) + the redeemable reward it produced. */
export const spinResults = sqliteTable(
  "spin_results",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    customerId: text()
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    ticketId: text()
      .notNull()
      .references(() => spinTickets.id, { onDelete: "cascade" }),
    prizeId: text().references(() => spinPrizes.id, { onDelete: "set null" }),
    prizeType: text({ enum: SPIN_PRIZE_TYPES }).notNull(),
    prizeName: text().notNull(),
    pointsAwarded: integer().notNull().default(0),
    costSatang: integer().notNull().default(0),
    /** Bangkok date "YYYY-MM-DD" (daily caps + report). */
    dayKey: text().notNull(),
    /** Redeem code for free_item / gift (shown as QR); null otherwise. */
    rewardCode: text(),
    rewardStatus: text({ enum: SPIN_REWARD_STATUSES }).notNull().default("none"),
    expiresAt: text(),
    redeemedAt: text(),
    redeemedBy: text().references(() => users.id, { onDelete: "set null" }),
    redeemedBranchId: text().references(() => branches.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("spin_results_ticket_unique").on(t.ticketId),
    unique("spin_results_code_unique").on(t.rewardCode),
    index("spin_results_shop_created_idx").on(t.shopId, t.createdAt),
    index("spin_results_customer_idx").on(t.shopId, t.customerId),
    index("spin_results_prize_day_idx").on(t.prizeId, t.dayKey),
  ],
);
