import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertValidCommission,
  canAdvanceDelivery,
  canReassign,
  computeRiderCommission,
  generateRiderToken,
  hashRiderToken,
  isRiderTokenShape,
  riderFirstName,
} from "./rider";

test("commission: per_trip / percent_fee / full_fee", () => {
  assert.equal(computeRiderCommission("per_trip", 2500, 4000), 2500);
  assert.equal(computeRiderCommission("percent_fee", 50, 4000), 2000);
  assert.equal(computeRiderCommission("percent_fee", 33, 1000), 330);
  assert.equal(computeRiderCommission("full_fee", 0, 4000), 4000);
  assert.equal(computeRiderCommission("full_fee", 0, -5), 0);
});

test("commission validation", () => {
  assert.throws(() => assertValidCommission("bogus", 1));
  assert.throws(() => assertValidCommission("per_trip", -1));
  assert.throws(() => assertValidCommission("percent_fee", 101));
  assertValidCommission("percent_fee", 100);
});

test("delivery transitions are forward-only", () => {
  assert.ok(canAdvanceDelivery("assigned", "picked_up"));
  assert.ok(canAdvanceDelivery("picked_up", "delivered"));
  assert.ok(!canAdvanceDelivery("assigned", "delivered"));
  assert.ok(!canAdvanceDelivery("delivered", "picked_up"));
  assert.ok(!canAdvanceDelivery(null, "picked_up"));
  assert.ok(canReassign(null) && canReassign("assigned"));
  assert.ok(!canReassign("picked_up") && !canReassign("delivered"));
});

test("token: random, url-safe, hashed with sha256 hex", () => {
  const a = generateRiderToken();
  const b = generateRiderToken();
  assert.notEqual(a, b);
  assert.ok(isRiderTokenShape(a));
  assert.ok(!isRiderTokenShape("short"));
  assert.match(hashRiderToken(a), /^[0-9a-f]{64}$/);
  assert.equal(hashRiderToken(a), hashRiderToken(a));
  assert.equal(riderFirstName("  สมชาย ใจดี "), "สมชาย");
});

test("LINE ID normalisation + chat link", async () => {
  const { normalizeLineId, lineChatUrl } = await import("./rider");
  assert.equal(normalizeLineId(""), null);
  assert.equal(normalizeLineId("  ~somchai.99 "), "somchai.99");
  assert.throws(() => normalizeLineId("bad id!"));
  assert.equal(lineChatUrl("somchai.99"), "https://line.me/R/ti/p/~somchai.99");
});

test("rider action rules: shop must accept first; COD collected before delivered", async () => {
  const { riderActionBlockReason, riderCashDue, needsCodCollection } = await import("./rider");
  const base = { status: "preparing" as const, paymentMethod: "cash" as const, paymentStatus: "unpaid" as const, codCollected: false };
  assert.match(riderActionBlockReason({ ...base, status: "pending", deliveryStatus: "assigned" }, "picked_up") ?? "", /ร้านยังไม่ได้รับ/);
  assert.equal(riderActionBlockReason({ ...base, deliveryStatus: "assigned" }, "picked_up"), null);
  assert.equal(riderActionBlockReason({ ...base, status: "ready", deliveryStatus: "assigned" }, "picked_up"), null);
  assert.match(riderActionBlockReason({ ...base, deliveryStatus: "picked_up" }, "delivered") ?? "", /ต้องเก็บเงินสด/);
  assert.equal(riderActionBlockReason({ ...base, deliveryStatus: "picked_up" }, "cod_delivered"), null);
  assert.equal(riderActionBlockReason({ ...base, deliveryStatus: "picked_up", codCollected: true }, "delivered"), null);
  assert.equal(riderActionBlockReason({ ...base, paymentMethod: "promptpay_qr", deliveryStatus: "picked_up" }, "delivered"), null);
  assert.match(riderActionBlockReason({ ...base, paymentMethod: "promptpay_qr", deliveryStatus: "picked_up" }, "cod_delivered") ?? "", /ไม่ใช่เก็บเงินปลายทาง/);
  assert.match(riderActionBlockReason({ ...base, status: "cancelled", deliveryStatus: "assigned" }, "picked_up") ?? "", /ยกเลิก/);
  assert.equal(needsCodCollection({ paymentMethod: "cash", paymentStatus: "paid", codCollected: false }), false);
  assert.equal(riderCashDue({ paymentMethod: "cash", paymentStatus: "unpaid", codCollected: false }), true);
  assert.equal(riderCashDue({ paymentMethod: "promptpay_qr", paymentStatus: "paid", codCollected: false }), false);
});
