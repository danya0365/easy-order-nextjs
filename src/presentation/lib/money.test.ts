import { test } from "node:test";
import assert from "node:assert/strict";

import { bahtToSatang, satangToBaht } from "./money";

test("bahtToSatang converts and rounds to integer satang", () => {
  assert.equal(bahtToSatang(299), 29900);
  assert.equal(bahtToSatang(10.5), 1050);
  assert.equal(bahtToSatang(0.1), 10);
  assert.equal(bahtToSatang(0), 0);
});

test("satangToBaht formats with two decimals", () => {
  assert.equal(satangToBaht(29900), "299.00");
  assert.equal(satangToBaht(1050), "10.50");
  assert.equal(satangToBaht(0), "0.00");
});

test("baht→satang→baht round-trips whole baht", () => {
  for (const baht of [1, 49, 299]) {
    assert.equal(satangToBaht(bahtToSatang(baht)), `${baht}.00`);
  }
});

test("satangToBaht groups thousands (th-TH locale)", () => {
  assert.equal(satangToBaht(bahtToSatang(1000)), "1,000.00");
});
