import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";

/**
 * Prepaid CREDIT wallet (independent of day-subscription / daily-fee billing).
 * Config rows: id "platform" (shop_id null) holds platform defaults + master
 * switch; id = shop id holds that shop's override JSON.
 */
export const creditConfigs = sqliteTable("credit_configs", {
  id: text().primaryKey(),
  shopId: text().references(() => shops.id, { onDelete: "cascade" }),
  /** JSON (CreditPlatformConfig for "platform", CreditShopOverride for shops). */
  config: text().notNull(),
  updatedBy: text(),
  updatedAt: updatedAt(),
});

/** Current balance per shop (denormalised from the ledger, updated atomically). */
export const creditWallets = sqliteTable("credit_wallets", {
  shopId: text()
    .primaryKey()
    .references(() => shops.id, { onDelete: "cascade" }),
  balanceSatang: integer().notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const CREDIT_LEDGER_TYPES = ["topup", "deduction", "refund", "adjust", "bonus", "starting"] as const;

/** Immutable ledger — rows are only ever inserted. */
export const creditLedger = sqliteTable(
  "credit_ledger",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    type: text({ enum: CREDIT_LEDGER_TYPES }).notNull(),
    /** Signed change (negative = deduction). */
    amountSatang: integer().notNull(),
    balanceAfterSatang: integer().notNull(),
    reason: text(),
    /** null = system (order hook). */
    actorUserId: text(),
    orderId: text(),
    topupId: text(),
    /** Unique key that makes order hooks idempotent (deduct:<orderId> / refund:<orderId>). */
    idempotencyKey: text(),
    /** JSON extras (order total, rule snapshot, …). */
    meta: text(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("credit_ledger_idem_unique").on(t.idempotencyKey),
    index("credit_ledger_shop_created_idx").on(t.shopId, t.createdAt),
    index("credit_ledger_order_idx").on(t.orderId),
  ],
);

export const CREDIT_TOPUP_STATUSES = ["pending", "approved", "rejected"] as const;

export const creditTopups = sqliteTable(
  "credit_topups",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    packageId: text(),
    amountSatang: integer().notNull(),
    bonusSatang: integer().notNull().default(0),
    slipUrl: text().notNull(),
    status: text({ enum: CREDIT_TOPUP_STATUSES }).notNull().default("pending"),
    note: text(),
    submittedBy: text(),
    reviewedBy: text(),
    reviewedAt: text(),
    rejectReason: text(),
    /** Slip auto-verification hook result (JSON), null = not attempted. */
    verifyMeta: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index("credit_topups_shop_created_idx").on(t.shopId, t.createdAt),
    index("credit_topups_status_created_idx").on(t.status, t.createdAt),
  ],
);

/**
 * One row per shop per settled business day (daily threshold fee). Unique
 * (shop_id, business_date) makes settlement idempotent; the ledger entry it
 * points to carries idempotency key `daily:<shopId>:<businessDate>`.
 */
export const creditDailySettlements = sqliteTable(
  "credit_daily_settlements",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    businessDate: text().notNull(),
    periodStart: text().notNull(),
    periodEnd: text().notNull(),
    cutoffTime: text().notNull(),
    salesSatang: integer().notNull(),
    orderCount: integer().notNull(),
    thresholdSatang: integer().notNull(),
    feeSatang: integer().notNull(),
    /** Amount actually deducted (0 = below threshold). */
    chargedSatang: integer().notNull(),
    ledgerEntryId: text(),
    /** "cron" | "admin:<userId>" */
    settledBy: text(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("credit_daily_shop_date_unique").on(t.shopId, t.businessDate),
    index("credit_daily_date_idx").on(t.businessDate),
  ],
);
