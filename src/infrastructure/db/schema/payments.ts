import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";
import { subscriptions } from "./subscriptions";
import { users } from "./users";

export const PAYMENT_STATUSES = ["pending", "approved", "rejected"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** A top-up payment submission (PromptPay slip) awaiting admin verification. */
export const payments = sqliteTable(
  "payments",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    subscriptionId: text()
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    amountSatang: integer().notNull(),
    // What this top-up grants: base days, free bonus days, and the chosen preset
    // id (null = a custom-day order). All server-computed, never client-supplied.
    daysToAdd: integer().notNull().default(30),
    bonusDays: integer().notNull().default(0),
    packageId: text(),
    // Path/URL to the uploaded slip image.
    slipUrl: text().notNull(),
    status: text({ enum: PAYMENT_STATUSES }).notNull().default("pending"),
    submittedBy: text()
      .notNull()
      .references(() => users.id),
    verifiedBy: text().references(() => users.id),
    verifiedAt: text(),
    rejectReason: text(),
    // Snapshot (at submit time) of the expiry this payment would set if approved.
    // Approval recomputes from the live expiry so late approvals aren't shorted.
    coversPeriodStartAt: text(),
    coversPeriodDueAt: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("payments_shop_created_idx").on(t.shopId, t.createdAt),
    // (status, createdAt) backs the admin review queue's keyset pagination.
    index("payments_status_created_idx").on(t.status, t.createdAt),
  ],
);
