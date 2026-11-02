import { test } from "node:test";
import assert from "node:assert/strict";

import {
  applyPriceOp,
  bulkQueryString,
  canRunBulkOp,
  filterBulkItems,
  normalizeBulkIds,
  pageOf,
  parseBulkQuery,
  planBulk,
  type BulkItem,
} from "./menu-bulk";

const item = (id: string, over: Partial<BulkItem> = {}): BulkItem => ({
  id, shopId: "s", name: `เมนู ${id}`, categoryId: "c1", priceSatang: 5000,
  isAvailable: true, isRecommended: false, ...over,
});

test("applyPriceOp: set / ±baht / ±% with rounding, never negative", () => {
  assert.equal(applyPriceOp(5000, { kind: "price", mode: "set", amount: 45, rounding: "none" }), 4500);
  assert.equal(applyPriceOp(5000, { kind: "price", mode: "baht", amount: 5, rounding: "none" }), 5500);
  assert.equal(applyPriceOp(5000, { kind: "price", mode: "baht", amount: -10, rounding: "none" }), 4000);
  assert.equal(applyPriceOp(5000, { kind: "price", mode: "percent", amount: 7, rounding: "baht" }), 5400); // 53.5 → 54
  assert.equal(applyPriceOp(5000, { kind: "price", mode: "percent", amount: 7, rounding: "five" }), 5500);
  assert.equal(applyPriceOp(4400, { kind: "price", mode: "percent", amount: 10, rounding: "ten" }), 5000);
  assert.equal(applyPriceOp(3333, { kind: "price", mode: "percent", amount: -10, rounding: "none" }), 3000);
  assert.throws(() => applyPriceOp(5000, { kind: "price", mode: "baht", amount: -60, rounding: "none" }), /ติดลบ/);
  assert.throws(() => applyPriceOp(5000, { kind: "price", mode: "set", amount: -1, rounding: "none" }), /ติดลบ/);
  assert.throws(() => applyPriceOp(5000, { kind: "price", mode: "percent", amount: -150, rounding: "none" }));
  assert.throws(() => applyPriceOp(5000, { kind: "price", mode: "set", amount: Number.NaN, rounding: "none" }));
});

test("planBulk: diff rows, unchanged rows flagged, delete has no after", () => {
  const rows = planBulk([item("a"), item("b", { isAvailable: false })], { kind: "available", value: false });
  assert.deepEqual(rows.map((r) => r.changed), [true, false]);
  assert.equal(rows[0].after!.isAvailable, false);
  const moved = planBulk([item("a")], { kind: "category", categoryId: "c2" });
  assert.equal(moved[0].after!.categoryId, "c2");
  const del = planBulk([item("a")], { kind: "delete" });
  assert.equal(del[0].after, null);
  assert.equal(planBulk([item("a")], { kind: "recommended", value: true })[0].after!.isRecommended, true);
});

test("permissions: staff only availability; owner/admin all", () => {
  for (const k of ["available", "recommended", "category", "price", "delete"] as const) {
    assert.equal(canRunBulkOp("shop_owner", k), true);
    assert.equal(canRunBulkOp("platform_admin", k), true);
    assert.equal(canRunBulkOp("branch_staff", k), k === "available");
    assert.equal(canRunBulkOp("customer", k), false);
  }
});

test("normalizeBulkIds: unique, non-empty, max 200", () => {
  assert.deepEqual(normalizeBulkIds(["a", "a", "b", "", 3]), ["a", "b"]);
  assert.throws(() => normalizeBulkIds([]));
  assert.throws(() => normalizeBulkIds("a"));
  assert.throws(() => normalizeBulkIds(Array.from({ length: 201 }, (_, i) => `i${i}`)), /200/);
  assert.equal(normalizeBulkIds(Array.from({ length: 200 }, (_, i) => `i${i}`)).length, 200);
});

test("list query: parse / serialize / filter / paginate", () => {
  const q = parseBulkQuery({ bq: "ข้าว", bcat: "c2", bstatus: "soldout", bpage: "2" });
  assert.deepEqual(q, { q: "ข้าว", cat: "c2", status: "soldout", page: 2 });
  assert.equal(bulkQueryString(q), "bq=%E0%B8%82%E0%B9%89%E0%B8%B2%E0%B8%A7&bcat=c2&bstatus=soldout&bpage=2");
  assert.equal(parseBulkQuery({ bstatus: "x", bpage: "-1" }).status, "all");
  const items = [item("1", { name: "ข้าวผัด" }), item("2", { name: "ข้าวมัน", isAvailable: false }), item("3", { name: "ชา", categoryId: "c2" })];
  assert.deepEqual(filterBulkItems(items, { q: "ข้าว", cat: null, status: "soldout", page: 1 }).map((i) => i.id), ["2"]);
  assert.deepEqual(filterBulkItems(items, { q: "", cat: "c2", status: "all", page: 1 }).map((i) => i.id), ["3"]);
  const many = Array.from({ length: 60 }, (_, i) => i);
  const p = pageOf(many, 3, 25);
  assert.deepEqual([p.page, p.totalPages, p.items.length, p.items[0]], [3, 3, 10, 50]);
  assert.equal(pageOf(many, 99, 25).page, 3);
});
