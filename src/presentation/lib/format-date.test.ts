import { test } from "node:test";
import assert from "node:assert/strict";

import { formatDateTime, formatTime } from "./format-date";
import { settleAfterRiderUpdate } from "@/src/application/use-cases/rider/RiderUseCases";

test("times render in Asia/Bangkok regardless of runtime zone", () => {
  // 17:30 UTC = 00:30 next day in Bangkok.
  assert.equal(formatTime("2026-11-01T17:30:00.000Z"), "00:30");
  assert.match(formatDateTime("2026-11-01T17:30:00.000Z"), /^2 พ\.ย\. 2569 00:30$/);
  assert.equal(formatTime("not a date"), "");
});

test("settleAfterRiderUpdate follows the status machine", () => {
  const base = {
    status: "pending" as const,
    paymentStatus: "unpaid" as const,
    paymentMethod: "cash" as const,
    deliveryStatus: "picked_up" as const,
    codCollected: false,
  };
  assert.deepEqual(settleAfterRiderUpdate(base), { complete: false, markPaid: false });
  assert.deepEqual(settleAfterRiderUpdate({ ...base, deliveryStatus: "delivered" }), { complete: true, markPaid: false });
  assert.deepEqual(settleAfterRiderUpdate({ ...base, deliveryStatus: "delivered", codCollected: true }), { complete: true, markPaid: true });
  assert.deepEqual(settleAfterRiderUpdate({ ...base, status: "cancelled", deliveryStatus: "delivered", codCollected: true }), { complete: false, markPaid: false });
  assert.deepEqual(settleAfterRiderUpdate({ ...base, paymentMethod: "promptpay_qr", codCollected: true, deliveryStatus: "delivered" }), { complete: true, markPaid: false });
});
