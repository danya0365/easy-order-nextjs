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
