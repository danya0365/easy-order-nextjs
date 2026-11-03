import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CREDIT_CONFIG,
  bangkokPeriodStarts,
  computeDeduction,
  effectiveConfig,
  normalizePlatformConfig,
  orderGate,
  resolveCreditTopup,
  shouldDeductAt,
  type CreditDeductionConfig,
} from "./credit";

const ded = (o: Partial<CreditDeductionConfig>): CreditDeductionConfig => ({ ...DEFAULT_CREDIT_CONFIG.deduction, ...o });

test("fixed / percent / fixed+percent / tiered", () => {
  assert.equal(computeDeduction(ded({ mode: "fixed", fixedSatang: 300 }), 10000).amountSatang, 300);
  assert.equal(computeDeduction(ded({ mode: "percent", percent: 2.5 }), 10000).amountSatang, 250);
  assert.equal(computeDeduction(ded({ mode: "fixed_percent", fixedSatang: 100, percent: 1 }), 20000).amountSatang, 300);
  const tiered = ded({ mode: "tiered", tiers: [{ minTotalSatang: 0, feeSatang: 100 }, { minTotalSatang: 30000, feeSatang: 300 }, { minTotalSatang: 100000, feeSatang: 800 }] });
  assert.equal(computeDeduction(tiered, 5000).amountSatang, 100);
  assert.equal(computeDeduction(tiered, 30000).amountSatang, 300);
  assert.equal(computeDeduction(tiered, 250000).amountSatang, 800);
});

test("min / max clamp and percent rounding", () => {
  assert.equal(computeDeduction(ded({ mode: "percent", percent: 1, minSatang: 200 }), 5000).amountSatang, 200);
  assert.equal(computeDeduction(ded({ mode: "percent", percent: 10, maxSatang: 1000 }), 50000).amountSatang, 1000);
  assert.equal(computeDeduction(ded({ mode: "percent", percent: 3 }), 3333).amountSatang, 100);
  assert.equal(computeDeduction(ded({ mode: "fixed", fixedSatang: 100 }), -50).amountSatang, 100);
});

test("free quota per day then per month", () => {
  const c = ded({ mode: "fixed", fixedSatang: 100, freePerDay: 2, freePerMonth: 5 });
  assert.deepEqual(computeDeduction(c, 1000, 0, 0).free, true);
  assert.deepEqual(computeDeduction(c, 1000, 1, 1).free, true);
  // day quota used → month quota still has room
  assert.equal(computeDeduction(c, 1000, 2, 3).free, true);
  const r = computeDeduction(c, 1000, 2, 5);
  assert.equal(r.free, false);
  assert.equal(r.amountSatang, 100);
});

test("triggers fire at or after their step, never on cancel", () => {
  assert.equal(shouldDeductAt("placed", "pending"), true);
  assert.equal(shouldDeductAt("accepted", "pending"), false);
  assert.equal(shouldDeductAt("accepted", "preparing"), true);
  assert.equal(shouldDeductAt("accepted", "completed"), true);
  assert.equal(shouldDeductAt("completed", "ready"), false);
  assert.equal(shouldDeductAt("completed", "completed"), true);
  assert.equal(shouldDeductAt("placed", "cancelled"), false);
});

test("order gate: warn / block / grace", () => {
  const lb = DEFAULT_CREDIT_CONFIG.lowBalance;
  assert.deepEqual(orderGate({ ...lb, warnSatang: 5000 }, 10000), { allowed: true, level: "ok" });
  assert.deepEqual(orderGate({ ...lb, warnSatang: 5000 }, 5000), { allowed: true, level: "low" });
  assert.deepEqual(orderGate({ ...lb, mode: "warn" }, -100), { allowed: true, level: "empty" });
  assert.deepEqual(orderGate({ ...lb, mode: "block" }, 0), { allowed: false, level: "blocked" });
  assert.equal(orderGate({ ...lb, mode: "block" }, 1).allowed, true);
  const g = { ...lb, mode: "grace" as const, graceOrders: 3, negativeLimitSatang: 0 };
  assert.equal(orderGate(g, -200, 2).allowed, true);
  assert.equal(orderGate(g, -300, 3).allowed, false);
  const n = { ...lb, mode: "grace" as const, graceOrders: 0, negativeLimitSatang: 1000 };
  assert.equal(orderGate(n, -999).allowed, true);
  assert.equal(orderGate(n, -1000).allowed, false);
  assert.equal(orderGate({ ...lb, mode: "grace", graceOrders: 0, negativeLimitSatang: 0 }, 0).allowed, false);
});

test("topup: package bonus, custom minimum, server-side only", () => {
  const t = DEFAULT_CREDIT_CONFIG.topup;
  assert.deepEqual(resolveCreditTopup(t, { packageId: "p500" }), { packageId: "p500", amountSatang: 50000, bonusSatang: 5000 });
  assert.throws(() => resolveCreditTopup(t, { packageId: "nope" }));
  assert.throws(() => resolveCreditTopup(t, { amountSatang: 5000 }), /ขั้นต่ำ/);
  assert.equal(resolveCreditTopup(t, { amountSatang: 25000 }).amountSatang, 25000);
  assert.throws(() => resolveCreditTopup({ ...t, allowCustom: false }, { amountSatang: 25000 }));
});

test("config normalisation, default OFF, shop override merge", () => {
  const p = normalizePlatformConfig({});
  assert.equal(p.enabled, false);
  const p2 = normalizePlatformConfig({ enabled: true, deduction: { mode: "bogus", fixedSatang: -5 }, topup: { promptpayId: "08-1234-5678" } });
  assert.equal(p2.deduction.mode, "fixed");
  assert.equal(p2.deduction.fixedSatang, 0);
  assert.equal(p2.topup.promptpayId, "0812345678");
  const e = effectiveConfig(p2, { deduction: { mode: "percent", percent: 2 }, lowBalance: { mode: "block" } });
  assert.equal(e.deduction.mode, "percent");
  assert.equal(e.deduction.percent, 2);
  assert.equal(e.lowBalance.mode, "block");
  assert.equal(effectiveConfig(p2, { enabled: false }).enabled, false);
});

test("bangkok period starts", () => {
  const { dayStart, monthStart } = bangkokPeriodStarts(new Date("2026-03-01T18:30:00Z")); // 02 Mar 01:30 BKK
  assert.equal(dayStart, "2026-03-01T17:00:00.000Z");
  assert.equal(monthStart, "2026-02-28T17:00:00.000Z");
});
