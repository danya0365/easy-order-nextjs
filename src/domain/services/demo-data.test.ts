import { test } from "node:test";
import assert from "node:assert/strict";

import { buildDemoDataPlan, DEMO_LABEL, DEMO_MAX_ORDERS } from "./demo-data";

const seq = () => {
  let x = 0.1;
  return () => (x = (x * 9301 + 0.49297) % 1);
};
const menu = [
  { id: "a", name: "ข้าวผัด", priceSatang: 5000 },
  { id: "b", name: "ชาไทย", priceSatang: 3000 },
];

test("demo plan: everything labelled, totals consistent, dates in past", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const p = buildDemoDataPlan(menu, { orders: 9, customers: 3, riders: 2, now, random: seq() });
  assert.equal(p.orders.length, 9);
  assert.equal(p.customers.length, 3);
  assert.equal(p.riders.length, 2);
  for (const c of p.customers) assert.ok(c.displayName.startsWith(DEMO_LABEL) && c.points > 0);
  for (const r of p.riders) assert.ok(r.name.startsWith(DEMO_LABEL));
  for (const o of p.orders) {
    assert.equal(o.note, DEMO_LABEL);
    assert.ok(o.lines.length >= 1);
    assert.equal(o.subtotalSatang, o.lines.reduce((a, l) => a + l.unitPriceSatang * l.quantity, 0));
    assert.ok(new Date(o.createdAt) < now);
    if (o.fulfillmentType === "delivery") assert.notEqual(o.riderIdx, null);
  }
  assert.ok(p.orders.some((o) => o.fulfillmentType === "delivery"));
});

test("demo plan: clamps counts, no riders ⇒ no delivery, empty menu uses labelled fallback", () => {
  const p = buildDemoDataPlan([], { orders: 999, customers: -3, riders: 0, now: new Date(), random: seq() });
  assert.equal(p.orders.length, DEMO_MAX_ORDERS);
  assert.equal(p.customers.length, 0);
  assert.ok(p.orders.every((o) => o.riderIdx === null && o.fulfillmentType !== "delivery" && o.customerIdx === null));
  assert.ok(p.orders[0].lines[0].name.startsWith(DEMO_LABEL));
  assert.equal(p.orders[0].lines[0].menuItemId, null);
});
