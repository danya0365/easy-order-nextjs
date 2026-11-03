import { test } from "node:test";
import assert from "node:assert/strict";

import { orderQrStatus, orderQrStorageKey } from "./order-qr-expiry";

const D = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 10, 3);

test("unknown when never printed on this device", () => {
  assert.deepEqual(orderQrStatus(null, now), { kind: "unknown" });
  assert.deepEqual(orderQrStatus(Number.NaN, now), { kind: "unknown" });
});
test("ok with days left beyond warn window", () => {
  assert.deepEqual(orderQrStatus(now + 14 * D, now), { kind: "ok", days: 14 });
  assert.deepEqual(orderQrStatus(now + 3 * D + 1, now), { kind: "ok", days: 4 });
});
test("soon within 3 days", () => {
  assert.deepEqual(orderQrStatus(now + 3 * D, now), { kind: "soon", days: 3 });
  assert.deepEqual(orderQrStatus(now + 1000, now), { kind: "soon", days: 1 });
});
test("expired at/after exp", () => {
  assert.deepEqual(orderQrStatus(now, now), { kind: "expired", days: 0 });
  assert.deepEqual(orderQrStatus(now - 2 * D - 5, now), { kind: "expired", days: 2 });
});
test("storage key is per shop", () => {
  assert.equal(orderQrStorageKey("s1"), "eo_orderqr_exp:s1");
});
