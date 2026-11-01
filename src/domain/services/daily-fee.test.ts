import { test } from "node:test";
import assert from "node:assert/strict";
import {
  businessDayFrom,
  dailyFeeFor,
  dayStartContaining,
  firstBillingDayStart,
  termsAt,
  type DailyFeeTermsVersion,
} from "./daily-fee";

const on = (effectiveAt: string, extra: Partial<DailyFeeTermsVersion> = {}): DailyFeeTermsVersion => ({
  shopId: null, effectiveAt, enabled: true, threshold: 50, feeSatang: 500, cutoffTime: "04:00", ...extra,
});

test("cutoff boundary: 03:59 BKK belongs to the previous business day, 04:00 starts a new one", () => {
  // 2026-11-02 03:59 BKK = 2026-11-01T20:59Z
  assert.equal(dayStartContaining(new Date("2026-11-01T20:59:59Z"), "04:00").toISOString(), "2026-10-31T21:00:00.000Z");
  assert.equal(dayStartContaining(new Date("2026-11-01T21:00:00Z"), "04:00").toISOString(), "2026-11-01T21:00:00.000Z");
  const day = businessDayFrom([on("2026-01-01T00:00:00Z")], "s1", new Date("2026-10-31T21:00:00Z"));
  assert.equal(day.businessDate, "2026-11-01");
  assert.equal(day.end.toISOString(), "2026-11-01T21:00:00.000Z");
});

test("per-shop cutoff override changes the boundary for that shop only", () => {
  const v = [on("2026-01-01T00:00:00Z"), { ...on("2026-01-01T00:00:00Z"), shopId: "s1", cutoffTime: "23:30", threshold: 0, feeSatang: 0 }];
  assert.equal(termsAt(v, "s1", new Date("2026-11-01T00:00:00Z")).cutoffTime, "23:30");
  assert.equal(termsAt(v, "s2", new Date("2026-11-01T00:00:00Z")).cutoffTime, "04:00");
  // 23:29 BKK Nov 1 (16:29Z) → day began 23:30 BKK Oct 31
  assert.equal(dayStartContaining(new Date("2026-11-01T16:29:00Z"), "23:30").toISOString(), "2026-10-31T16:30:00.000Z");
  assert.equal(dayStartContaining(new Date("2026-11-01T16:30:00Z"), "23:30").toISOString(), "2026-11-01T16:30:00.000Z");
  // Clearing the override (later null row) falls back to the platform default.
  const cleared = [...v, { ...v[1], effectiveAt: "2026-06-01T00:00:00Z", cutoffTime: null }];
  assert.equal(termsAt(cleared, "s1", new Date("2026-11-01T00:00:00Z")).cutoffTime, "04:00");
});

test("fee is charged only when orders are STRICTLY greater than the threshold", () => {
  const t = { enabled: true, threshold: 50, feeSatang: 500, cutoffTime: "04:00" };
  assert.equal(dailyFeeFor(50, t), 0);
  assert.equal(dailyFeeFor(51, t), 500);
  assert.equal(dailyFeeFor(999, { ...t, enabled: false }), 0);
});

test("a settings change mid-day applies from the next business day", () => {
  const v = [on("2026-01-01T00:00:00Z"), on("2026-11-01T05:00:00Z", { threshold: 2, feeSatang: 900 })];
  const today = businessDayFrom(v, "s1", new Date("2026-10-31T21:00:00Z"));
  assert.equal(today.terms.threshold, 50);
  const next = businessDayFrom(v, "s1", today.end);
  assert.equal(next.terms.threshold, 2);
  assert.equal(next.terms.feeSatang, 900);
});

test("cutoff change keeps business-date labels unique (no double day)", () => {
  const v = [on("2026-01-01T00:00:00Z"), on("2026-11-01T05:00:00Z", { cutoffTime: "02:00" })];
  const d1 = businessDayFrom(v, "s1", new Date("2026-10-31T21:00:00Z"));
  const d2 = businessDayFrom(v, "s1", d1.end);
  assert.equal(d1.businessDate, "2026-11-01");
  assert.equal(d2.businessDate, "2026-11-02");
  assert.ok(d2.end.getTime() > d2.start.getTime());
});

test("billing starts only once daily fees were enabled", () => {
  assert.equal(firstBillingDayStart([], "s1", "2026-01-01T00:00:00Z"), null);
  assert.equal(
    firstBillingDayStart([on("2026-11-01T05:00:00Z")], "s1", "2026-01-01T00:00:00Z")!.toISOString(),
    "2026-10-31T21:00:00.000Z",
  );
});
