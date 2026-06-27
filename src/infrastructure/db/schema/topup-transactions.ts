import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt } from "./_shared";
import { shops } from "./shops";
import { payments } from "./payments";
import { users } from "./users";

export const TOPUP_TX_TYPES = ["topup", "adjustment"] as const;
export type TopupTxType = (typeof TOPUP_TX_TYPES)[number];

/** Immutable ledger of every day-balance change (audit trail for top-ups). */
export const topupTransactions = sqliteTable(
  "topup_transactions",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    // The approved payment this came from; null for manual/referral adjustments.
    paymentId: text().references(() => payments.id, { onDelete: "set null" }),
    type: text({ enum: TOPUP_TX_TYPES }).notNull(),
    daysAdded: integer().notNull(),
    bonusDaysAdded: integer().notNull().default(0),
    amountSatang: integer().notNull().default(0),
    // Expiry before/after the change, for auditability.
    expiryBeforeAt: text(),
    expiryAfterAt: text().notNull(),
    // Users are never hard-deleted, so keep this non-null with no cascade.
    performedBy: text()
      .notNull()
      .references(() => users.id),
    note: text(),
    createdAt: createdAt(),
  },
  (t) => [index("topup_tx_shop_created_idx").on(t.shopId, t.createdAt)],
);
