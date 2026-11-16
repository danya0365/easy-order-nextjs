import { test } from "node:test";
import assert from "node:assert/strict";

import {
  bangkokDayKey,
  endOfBangkokMonthISO,
  inMonthlyWindow,
  normalizeRewardCode,
  pickWeighted,
  prizeOdds,
  rewardCodeFromBytes,
  ticketsForOrder,
} from "@/src/domain/services/lucky-wheel";

test("pickWeighted maps rand ranges to items by weight", () => {
  const items = [{ id: "a", weight: 1 }, { id: "b", weight: 3 }];
  assert.equal(pickWeighted(items, 0)?.id, "a");
  assert.equal(pickWeighted(items, 1)?.id, "b");
  assert.equal(pickWeighted(items, 3)?.id, "b");
  assert.equal(pickWeighted([], 0), null);
});

test("prizeOdds are percentages", () => {
  assert.deepEqual(prizeOdds([{ id: "a", weight: 1 }, { id: "b", weight: 3 }]), { a: 25, b: 75 });
});

test("monthly window uses Bangkok calendar", () => {
  assert.equal(inMonthlyWindow(new Date("2026-11-28T00:00:00Z"), 3), true); // 28 Nov 07:00 BKK
  assert.equal(inMonthlyWindow(new Date("2026-11-27T16:59:00Z"), 3), false); // 27 Nov 23:59 BKK
  assert.equal(inMonthlyWindow(new Date("2026-11-01T00:00:00Z"), 31), true);
  assert.equal(bangkokDayKey(new Date("2026-11-30T17:30:00Z")), "2026-12-01");
  assert.equal(endOfBangkokMonthISO(new Date("2026-11-15T00:00:00Z")), "2026-11-30T17:00:00.000Z");
});

test("reward codes + normalisation", () => {
  const code = rewardCodeFromBytes(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 31]));
  assert.equal(code, "ABCDEFG9");
  assert.equal(normalizeRewardCode(" abcd-efg9 "), "ABCDEFG9");
  assert.equal(normalizeRewardCode("https://x/y?code=abcdefg9"), "ABCDEFG9");
});

test("ticketsForOrder respects minimum", () => {
  assert.equal(ticketsForOrder({ totalSatang: 4999 }, { minOrderSatang: 5000, ticketsPerOrder: 2 }), 0);
  assert.equal(ticketsForOrder({ totalSatang: 5000 }, { minOrderSatang: 5000, ticketsPerOrder: 2 }), 2);
});
