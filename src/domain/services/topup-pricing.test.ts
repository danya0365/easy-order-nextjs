/**
 * Pure-function tests. No test framework is installed — run with Node's built-in
 * runner via tsx:  npx tsx --test src/domain/services/topup-pricing.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TOPUP_PROMO,
  DEFAULT_PRICE_PER_DAY_SATANG,
  computeCustomBonusDays,
  resolveTopupQuote,
  computeSavingsPercent,
  computeNewExpiry,
  isPromoActive,
  type PromoConfig,
} from "./topup-pricing";
import { computeBillingState } from "./subscription-status";

const RATE = DEFAULT_PRICE_PER_DAY_SATANG; // 1000 satang = ฿10/วัน
const DAY = 864e5;
const NO_PROMO: PromoConfig = { active: false, percentOff: 0 };
const PROMO50: PromoConfig = { active: true, percentOff: 50 };

test("presets resolve to correct total days + price = days × rate (no promo)", () => {
  const q90 = resolveTopupQuote({ packageId: "d90" }, RATE, NO_PROMO);
  assert.equal(q90.baseDays, 90);
  assert.equal(q90.bonusDays, 7);
  assert.equal(q90.totalDays, 97);
  assert.equal(q90.amountSatang, 90 * RATE);
  assert.equal(q90.fullAmountSatang, 90 * RATE);
  assert.equal(q90.promoPercentOff, 0);

  const q365 = resolveTopupQuote({ packageId: "d365" }, RATE, NO_PROMO);
  assert.equal(q365.totalDays, 410);
  assert.equal(q365.amountSatang, 365 * RATE);
});

test("preset price scales with the shop's per-day rate", () => {
  // At ฿20/วัน (2000 satang) a 30-day preset costs 30 × 2000 = 60000.
  const q30 = resolveTopupQuote({ packageId: "d30" }, 2000, NO_PROMO);
  assert.equal(q30.amountSatang, 60000);
  assert.equal(q30.fullAmountSatang, 60000);
  assert.equal(q30.bonusDays, 0); // bonus days unaffected by rate

  const q365 = resolveTopupQuote({ packageId: "d365" }, 2000, NO_PROMO);
  assert.equal(q365.amountSatang, 365 * 2000);
  assert.equal(q365.bonusDays, 45);
});

test("unknown package id throws", () => {
  assert.throws(() => resolveTopupQuote({ packageId: "nope" }, RATE));
});

test("custom bonus tiers at boundaries", () => {
  assert.equal(computeCustomBonusDays(89), 0);
  assert.equal(computeCustomBonusDays(90), 7);
  assert.equal(computeCustomBonusDays(149), 7);
  assert.equal(computeCustomBonusDays(150), 30);
  assert.equal(computeCustomBonusDays(364), 30);
  assert.equal(computeCustomBonusDays(365), 45);
});

test("custom quote prices days * rate and adds tiered bonus (no promo)", () => {
  const q = resolveTopupQuote({ customDays: 150 }, RATE, NO_PROMO);
  assert.equal(q.packageId, null);
  assert.equal(q.baseDays, 150);
  assert.equal(q.bonusDays, 30);
  assert.equal(q.totalDays, 180);
  assert.equal(q.amountSatang, 150 * RATE);
});

test("promo discounts both presets and custom orders", () => {
  // preset: full 180000 → 50% off = 90000, full kept for strikethrough.
  const q180 = resolveTopupQuote({ packageId: "d180" }, RATE, PROMO50);
  assert.equal(q180.fullAmountSatang, 180000);
  assert.equal(q180.amountSatang, 90000);
  assert.equal(q180.promoPercentOff, 50);
  assert.equal(q180.totalDays, 200); // days/bonus unaffected by discount

  // custom: 100 days * 1000 = 100000 → 50000.
  const qc = resolveTopupQuote({ customDays: 100 }, RATE, PROMO50);
  assert.equal(qc.fullAmountSatang, 100000);
  assert.equal(qc.amountSatang, 50000);
  assert.equal(qc.promoPercentOff, 50);

  // off-switch: inactive promo → amount equals full, no discount.
  const off = resolveTopupQuote({ packageId: "d180" }, RATE, NO_PROMO);
  assert.equal(off.amountSatang, off.fullAmountSatang);
  assert.equal(off.promoPercentOff, 0);

  assert.equal(isPromoActive(PROMO50), true);
  assert.equal(isPromoActive(NO_PROMO), false);
});

test("default promo param matches the live TOPUP_PROMO config", () => {
  const q = resolveTopupQuote({ packageId: "d30" }, RATE); // no promo arg
  const expected = isPromoActive(TOPUP_PROMO) ? TOPUP_PROMO.percentOff : 0;
  assert.equal(q.promoPercentOff, expected);
});

test("custom days out of range throws", () => {
  assert.throws(() => resolveTopupQuote({ customDays: 0 }, RATE));
  assert.throws(() => resolveTopupQuote({ customDays: 99999 }, RATE));
});

test("savings reflect free bonus days (no promo)", () => {
  // 180-day preset: total 200 days valued at 200*1000=200000, price 180000 → 10%.
  const q180 = resolveTopupQuote({ packageId: "d180" }, RATE, NO_PROMO);
  assert.equal(computeSavingsPercent(q180, RATE), 10);
  // 30-day preset: no bonus → 0% savings.
  const q30 = resolveTopupQuote({ packageId: "d30" }, RATE, NO_PROMO);
  assert.equal(computeSavingsPercent(q30, RATE), 0);
});

test("computeNewExpiry stacks before expiry, restarts after lapse", () => {
  const now = new Date("2026-06-14T00:00:00.000Z");
  // (a) topping up early → extend from the future expiry, not now.
  const future = new Date(now.getTime() + 10 * DAY).toISOString();
  const stacked = computeNewExpiry(future, 30, now);
  assert.equal(stacked, new Date(now.getTime() + 40 * DAY).toISOString());

  // (b) topping up after lapse → start from now.
  const past = new Date(now.getTime() - 5 * DAY).toISOString();
  const restarted = computeNewExpiry(past, 30, now);
  assert.equal(restarted, new Date(now.getTime() + 30 * DAY).toISOString());

  // (c) exactly at expiry → from now.
  const atNow = computeNewExpiry(now.toISOString(), 30, now);
  assert.equal(atNow, new Date(now.getTime() + 30 * DAY).toISOString());
});

test("billing state: pre-expiry nudge, grace, then suspend", () => {
  const now = new Date("2026-06-14T00:00:00.000Z");
  const due = (days: number) =>
    new Date(now.getTime() + days * DAY).toISOString();

  // 8 days left → no nudge yet.
  let s = computeBillingState({ currentPeriodDueAt: due(8) }, now);
  assert.equal(s.state, "active");
  assert.equal(s.preExpiryBannerLevel, 0);
  assert.equal(s.daysUntilDue, 8);

  // 7 days left → first nudge.
  s = computeBillingState({ currentPeriodDueAt: due(7) }, now);
  assert.equal(s.preExpiryBannerLevel, 1);

  // 1 day left → most urgent nudge.
  s = computeBillingState({ currentPeriodDueAt: due(1) }, now);
  assert.equal(s.preExpiryBannerLevel, 7);

  // 1–7 days overdue → dunning banner, not suspended.
  s = computeBillingState({ currentPeriodDueAt: due(-3) }, now);
  assert.equal(s.state, "overdue");
  assert.equal(s.daysOverdue, 3);
  assert.equal(s.isSuspended, false);
  assert.equal(s.bannerLevel, 3);

  // > 7 days overdue → suspended.
  s = computeBillingState({ currentPeriodDueAt: due(-8) }, now);
  assert.equal(s.state, "suspended");
  assert.equal(s.isSuspended, true);
});
