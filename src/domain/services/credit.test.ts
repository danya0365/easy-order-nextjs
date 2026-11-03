import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CREDIT_CONFIG,
  addDaysYmd,
  creditCutoffFor,
  creditDayOf,
  creditDayWindow,
  dailyCreditFee,
  effectiveConfig,
  normalizePlatformConfig,
  orderGate,
  resolveCreditTopup,
  type CreditDailyConfig,
} from "./credit";

const daily = (o: Partial<CreditDailyConfig> = {}): CreditDailyConfig => ({ ...DEFAULT_CREDIT_CONFIG.daily, ...o });

test("defaults: ฿50 threshold, ฿5 fee, midnight cutoff, completed only", () => {
  const d = DEFAULT_CREDIT_CONFIG.daily;
  assert.equal(d.thresholdSatang, 5000);
  assert.equal(d.feeSatang, 500);
  assert.equal(d.cutoffTime, "00:00");
  assert.deepEqual(d.countStatuses, ["completed"]);
  assert.equal(DEFAULT_CREDIT_CONFIG.lowBalance.mode, "warn");
});

test("daily fee: below / at / above threshold", () => {
  assert.equal(dailyCreditFee(daily(), 0), 0);
  assert.equal(dailyCreditFee(daily(), 4999), 0);
  assert.equal(dailyCreditFee(daily(), 5000), 500);
  assert.equal(dailyCreditFee(daily(), 123456), 500);
  // strict mode: exactly at threshold is free
  assert.equal(dailyCreditFee(daily({ inclusive: false }), 5000), 0);
  assert.equal(dailyCreditFee(daily({ inclusive: false }), 5001), 500);
  assert.equal(dailyCreditFee(daily({ feeSatang: 0 }), 99999), 0);
});

test("business day window: midnight Bangkok, and custom cutoff", () => {
  const w = creditDayWindow("2026-11-02", "00:00");
  assert.equal(w.start.toISOString(), "2026-11-01T17:00:00.000Z");
  assert.equal(w.end.toISOString(), "2026-11-02T17:00:00.000Z");
  const w4 = creditDayWindow("2026-11-02", "04:00");
  assert.equal(w4.start.toISOString(), "2026-11-01T21:00:00.000Z");
  assert.equal(w4.end.toISOString(), "2026-11-02T21:00:00.000Z");
});

test("timezone boundary: 23:59 vs 00:00 Bangkok fall on different days", () => {
  assert.equal(creditDayOf(new Date("2026-11-02T16:59:59Z"), "00:00"), "2026-11-02"); // 23:59:59 BKK
  assert.equal(creditDayOf(new Date("2026-11-02T17:00:00Z"), "00:00"), "2026-11-03"); // 00:00 BKK
  // 02:00 BKK on the 3rd still belongs to the 2nd with a 04:00 cutoff
  assert.equal(creditDayOf(new Date("2026-11-02T19:00:00Z"), "04:00"), "2026-11-02");
  assert.equal(addDaysYmd("2026-12-31", 1), "2027-01-01");
  assert.equal(addDaysYmd("2026-03-01", -1), "2026-02-28");
});

test("shop cutoff reuse", () => {
  assert.equal(creditCutoffFor(daily(), null), "00:00");
  assert.equal(creditCutoffFor(daily(), "04:00"), "04:00");
  assert.equal(creditCutoffFor(daily({ useShopCutoff: false }), "04:00"), "00:00");
  assert.equal(creditCutoffFor(daily(), "bad"), "00:00");
});

test("order gate: warn only by default, block optional", () => {
  const lb = DEFAULT_CREDIT_CONFIG.lowBalance;
  assert.deepEqual(orderGate({ ...lb, warnSatang: 5000 }, 10000), { allowed: true, level: "ok" });
  assert.deepEqual(orderGate({ ...lb, warnSatang: 5000 }, 5000), { allowed: true, level: "low" });
  assert.deepEqual(orderGate(lb, -100), { allowed: true, level: "empty" });
  assert.deepEqual(orderGate({ ...lb, mode: "block" }, 0), { allowed: false, level: "blocked" });
  assert.equal(orderGate({ ...lb, mode: "block", negativeLimitSatang: 1000 }, -999).allowed, true);
  assert.equal(orderGate({ ...lb, mode: "block", negativeLimitSatang: 1000 }, -1000).allowed, false);
});

test("topup: package bonus, custom minimum, server-side only", () => {
  const t = DEFAULT_CREDIT_CONFIG.topup;
  assert.deepEqual(resolveCreditTopup(t, { packageId: "p500" }), { packageId: "p500", amountSatang: 50000, bonusSatang: 5000 });
  assert.throws(() => resolveCreditTopup(t, { packageId: "nope" }));
  assert.throws(() => resolveCreditTopup(t, { amountSatang: 5000 }), /ขั้นต่ำ/);
  assert.equal(resolveCreditTopup(t, { amountSatang: 25000 }).amountSatang, 25000);
  assert.throws(() => resolveCreditTopup({ ...t, allowCustom: false }, { amountSatang: 25000 }));
});

test("config normalisation: legacy per-order fields dropped, cancelled never counted, override merge", () => {
  const p = normalizePlatformConfig({});
  assert.equal(p.enabled, false);
  const legacy = normalizePlatformConfig({ enabled: true, deduction: { mode: "fixed", fixedSatang: 100 }, lowBalance: { mode: "grace", negativeLimitSatang: 300 } });
  assert.equal("deduction" in legacy, false);
  assert.equal(legacy.daily.thresholdSatang, 5000);
  assert.equal(legacy.lowBalance.mode, "block");
  const p2 = normalizePlatformConfig({ daily: { thresholdSatang: -5, countStatuses: ["cancelled", "ready", "completed"], cutoffTime: "25:00" }, topup: { promptpayId: "08-1234-5678" } });
  assert.equal(p2.daily.thresholdSatang, 0);
  assert.deepEqual(p2.daily.countStatuses, ["ready", "completed"]);
  assert.equal(p2.daily.cutoffTime, "00:00");
  assert.deepEqual(normalizePlatformConfig({ daily: { countStatuses: ["cancelled"] } }).daily.countStatuses, ["completed"]);
  assert.equal(p2.topup.promptpayId, "0812345678");
  const e = effectiveConfig(p2, { daily: { feeSatang: 1000 }, lowBalance: { mode: "block" } });
  assert.equal(e.daily.feeSatang, 1000);
  assert.equal(e.daily.thresholdSatang, 0);
  assert.equal(e.lowBalance.mode, "block");
  assert.equal(effectiveConfig(p2, { enabled: false }).enabled, false);
});
