/**
 * Shared seed helpers. Two jobs:
 *  - kill insert/idempotency boilerplate (insert, getOrCreate)
 *  - map seeded billing data onto the real day-top-up write path so demo data
 *    is identical to what the app produces (quotePayment, approveTopup).
 */
import { nanoid } from "nanoid";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

import {
  resolveTopupQuote,
  computeNewExpiry,
} from "../../src/domain/services/topup-pricing";
import type { SeedDb } from "./_db";

/** Insert one row (id defaults to a nanoid) and return its id for FK reuse. */
export async function insert<T extends SQLiteTable>(
  db: SeedDb,
  table: T,
  values: T["$inferInsert"],
): Promise<string> {
  const id = (values as { id?: string }).id ?? nanoid();
  await db.insert(table).values({ ...values, id } as T["$inferInsert"]);
  return id;
}

/**
 * Idempotent get-or-create. Pass the lookup query (resolved against a unique
 * column); inserts `values` only when nothing is found.
 */
export async function getOrCreate<T extends SQLiteTable>(
  db: SeedDb,
  table: T,
  lookup: Promise<{ id: string } | undefined>,
  values: T["$inferInsert"],
): Promise<{ id: string; created: boolean }> {
  const existing = await lookup;
  if (existing) return { id: existing.id, created: false };
  const id = await insert(db, table, values);
  return { id, created: true };
}

export interface QuotePaymentSpec {
  /** A preset id (e.g. "d180") OR a custom day count — exactly one. */
  packageId?: string | null;
  customDays?: number | null;
  pricePerDaySatang: number;
  /** The subscription's expiry at the moment the slip was submitted. */
  expiryAtSubmit: string;
  /** Treat this as "now" for the (back-dated) submission. */
  now: Date;
}

/** Mirror of SubmitPaymentSlipUseCase: derive a payment's top-up fields. */
export function quotePayment(spec: QuotePaymentSpec) {
  const quote = resolveTopupQuote(
    { packageId: spec.packageId, customDays: spec.customDays },
    spec.pricePerDaySatang,
  );
  const coversPeriodStartAt = new Date(
    Math.max(spec.now.getTime(), new Date(spec.expiryAtSubmit).getTime()),
  ).toISOString();
  const coversPeriodDueAt = computeNewExpiry(
    spec.expiryAtSubmit,
    quote.totalDays,
    spec.now,
  );
  return {
    quote,
    paymentFields: {
      amountSatang: quote.amountSatang,
      daysToAdd: quote.baseDays,
      bonusDays: quote.bonusDays,
      packageId: quote.packageId,
      coversPeriodStartAt,
      coversPeriodDueAt,
    },
  };
}

export interface ApproveTopupSpec {
  shopId: string;
  paymentId: string;
  reviewerId: string;
  daysToAdd: number;
  bonusDays: number;
  amountSatang: number;
  /** The subscription's live expiry at approval time. */
  expiryBeforeAt: string;
  now: Date;
}

/** Mirror of VerifyPaymentUseCase approval: ledger row + advanced expiry. */
export function approveTopup(spec: ApproveTopupSpec) {
  const totalDays = spec.daysToAdd + spec.bonusDays;
  const currentPeriodStartAt = new Date(
    Math.max(spec.now.getTime(), new Date(spec.expiryBeforeAt).getTime()),
  ).toISOString();
  const expiryAfterAt = computeNewExpiry(
    spec.expiryBeforeAt,
    totalDays,
    spec.now,
  );
  return {
    subscriptionAdvance: {
      currentPeriodStartAt,
      currentPeriodDueAt: expiryAfterAt,
      status: "active" as const,
    },
    ledgerRow: {
      shopId: spec.shopId,
      paymentId: spec.paymentId,
      type: "topup" as const,
      daysAdded: spec.daysToAdd,
      bonusDaysAdded: spec.bonusDays,
      amountSatang: spec.amountSatang,
      expiryBeforeAt: spec.expiryBeforeAt,
      expiryAfterAt,
      performedBy: spec.reviewerId,
    },
  };
}
