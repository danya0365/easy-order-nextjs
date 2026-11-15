import { test } from "node:test";
import assert from "node:assert/strict";

import type { Branch } from "@/src/domain/entities";
import {
  branchClosedReason,
  branchStaffMayCancel,
  mainBranchOf,
  orderInBranch,
  resolveOrderBranch,
} from "@/src/domain/services/branch-ordering";
import { namedBranchRows } from "@/src/domain/services/branch-report";
import {
  signOrderAccessToken,
  verifyOrderAccessToken,
} from "@/src/domain/services/order-access-token";

function br(id: string, createdAt: string, extra: Partial<Branch> = {}): Branch {
  return {
    id,
    shopId: "s1",
    name: `สาขา ${id}`,
    isActive: true,
    acceptingOrders: true,
    latitude: null,
    longitude: null,
    address: null,
    createdAt,
    updatedAt: createdAt,
    ...extra,
  };
}

const b1 = br("b1", "2026-01-01T00:00:00.000Z");
const b2 = br("b2", "2026-02-01T00:00:00.000Z");

test("main branch = oldest branch regardless of input order", () => {
  assert.equal(mainBranchOf([b2, b1])?.id, "b1");
  assert.equal(mainBranchOf([]), null);
});

test("resolveOrderBranch: requested own branch, else main (never foreign)", () => {
  assert.equal(resolveOrderBranch([b1, b2], "b2")?.id, "b2");
  assert.equal(resolveOrderBranch([b1, b2], "other-shop-branch")?.id, "b1");
  assert.equal(resolveOrderBranch([b1, b2], null)?.id, "b1");
  assert.equal(resolveOrderBranch([], "b2"), null);
});

test("branchClosedReason: inactive / not accepting / open", () => {
  assert.match(branchClosedReason(br("x", "t", { isActive: false })) ?? "", /ปิดให้บริการ/);
  assert.match(branchClosedReason(br("x", "t", { acceptingOrders: false })) ?? "", /ปิดรับออเดอร์/);
  assert.equal(branchClosedReason(b1), null);
  assert.equal(branchClosedReason(null), null);
});

test("orderInBranch: NULL branch belongs to the main branch only", () => {
  assert.equal(orderInBranch("b2", "b2", "b1"), true);
  assert.equal(orderInBranch("b1", "b2", "b1"), false);
  assert.equal(orderInBranch(null, "b1", "b1"), true);
  assert.equal(orderInBranch(null, "b2", "b1"), false);
});

test("namedBranchRows folds unassigned into main and lists idle branches", () => {
  const rows = namedBranchRows(
    [
      { key: "", name: "", orders: 2, revenueSatang: 1000 },
      { key: "b1", name: "b1", orders: 1, revenueSatang: 500 },
    ],
    [b1, b2],
  );
  assert.deepEqual(
    rows.map((r) => [r.key, r.orders, r.revenueSatang]),
    [
      ["b1", 3, 1500],
      ["b2", 0, 0],
    ],
  );
});

test("branch QR token is domain-separated from the shop token", () => {
  const secret = "test-secret";
  const now = new Date();
  const exp = Math.floor(now.getTime() / 1000) + 600;
  const shopTok = signOrderAccessToken({ shopId: "s1", slug: "demo", exp }, secret);
  const b2Tok = signOrderAccessToken({ shopId: "s1", slug: "demo#b:b2", exp }, secret);
  // A shop-level token never passes as a branch token, and vice versa.
  assert.equal(verifyOrderAccessToken(shopTok, { shopId: "s1", slug: "demo#b:b2", secret, now }), null);
  assert.equal(verifyOrderAccessToken(b2Tok, { shopId: "s1", slug: "demo", secret, now }), null);
  // A branch-2 token never selects branch 1.
  assert.equal(verifyOrderAccessToken(b2Tok, { shopId: "s1", slug: "demo#b:b1", secret, now }), null);
  assert.notEqual(verifyOrderAccessToken(b2Tok, { shopId: "s1", slug: "demo#b:b2", secret, now }), null);
});

test("branchStaffMayCancel needs both the platform and the shop switch", () => {
  assert.equal(branchStaffMayCancel(true, true), true);
  assert.equal(branchStaffMayCancel(true, false), false);
  assert.equal(branchStaffMayCancel(false, true), false);
});
