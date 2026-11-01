import { test } from "node:test";
import assert from "node:assert/strict";

import type { MenuCategory, MenuItem } from "@/src/domain/entities";
import {
  buildBookPages,
  flattenSections,
  groupByCategory,
  isPublicMenuItem,
  paginate,
  parseMenuView,
  parsePageParam,
} from "./public-menu";

const T = "2026-01-01T00:00:00.000Z";
const cat = (id: string, over: Partial<MenuCategory> = {}): MenuCategory => ({
  id, shopId: "s1", name: id, sortOrder: 0, isActive: true, createdAt: T, updatedAt: T, ...over,
});
const item = (id: string, categoryId: string, over: Partial<MenuItem> = {}): MenuItem => ({
  id, shopId: "s1", categoryId, name: id, description: null, priceSatang: 1000, imageUrl: null,
  isAvailable: true, isRecommended: false, sortOrder: 0, createdAt: T, updatedAt: T, ...over,
});

test("parseMenuView: only 'book' selects book mode", () => {
  assert.equal(parseMenuView("book"), "book");
  assert.equal(parseMenuView(["book", "x"]), "book");
  assert.equal(parseMenuView("BOOK"), "normal");
  assert.equal(parseMenuView(undefined), "normal");
});

test("parsePageParam: junk and <1 fall back to 1", () => {
  assert.equal(parsePageParam("3"), 3);
  assert.equal(parsePageParam("0"), 1);
  assert.equal(parsePageParam("-2"), 1);
  assert.equal(parsePageParam("abc"), 1);
  assert.equal(parsePageParam(undefined), 1);
});

test("paginate clamps page and reports totals", () => {
  const all = Array.from({ length: 25 }, (_, i) => i);
  assert.deepEqual(paginate(all, 1, 12).items, all.slice(0, 12));
  const last = paginate(all, 99, 12);
  assert.equal(last.page, 3);
  assert.deepEqual(last.items, [24]);
  assert.equal(last.totalPages, 3);
  assert.equal(paginate([], 5, 12).totalPages, 1);
  assert.equal(paginate([], 5, 12).page, 1);
});

test("isPublicMenuItem respects availability, category active + ownership", () => {
  const c = cat("c1");
  assert.equal(isPublicMenuItem(item("a", "c1"), c), true);
  assert.equal(isPublicMenuItem(item("a", "c1", { isAvailable: false }), c), false);
  assert.equal(isPublicMenuItem(item("a", "c1"), cat("c1", { isActive: false })), false);
  assert.equal(isPublicMenuItem(item("a", "c1"), null), false);
  assert.equal(isPublicMenuItem(item("a", "c2"), c), false);
  assert.equal(isPublicMenuItem(item("a", "c1", { shopId: "other" }), c), false);
});

test("flatten + groupByCategory round-trips and filters by category", () => {
  const sections = [
    { category: cat("c1"), items: [item("a", "c1"), item("b", "c1")] },
    { category: cat("c2"), items: [item("c", "c2")] },
  ];
  const flat = flattenSections(sections);
  assert.equal(flat.length, 3);
  assert.deepEqual(groupByCategory(flat).map((s) => s.items.length), [2, 1]);
  assert.deepEqual(flattenSections(sections, "c2").map((r) => r.item.id), ["c"]);
});

test("buildBookPages: cover, toc, chunked categories, even count, back cover last", () => {
  const sections = [
    { category: cat("c1"), items: Array.from({ length: 7 }, (_, i) => item(`a${i}`, "c1")) },
    { category: cat("c2"), items: [item("b", "c2")] },
    { category: cat("empty"), items: [] },
  ];
  const pages = buildBookPages(sections, 6);
  assert.equal(pages[0].kind, "cover");
  assert.equal(pages[1].kind, "toc");
  assert.equal(pages[pages.length - 1].kind, "back");
  assert.equal(pages.length % 2, 0);
  const cats = pages.filter((p) => p.kind === "category");
  assert.equal(cats.length, 3);
  assert.deepEqual(cats.map((p) => (p.kind === "category" ? p.items.length : 0)), [6, 1, 1]);
  const toc = pages[1];
  assert.ok(toc.kind === "toc");
  assert.deepEqual(toc.sections.map((s) => s.page), [3, 5]);
});

test("buildBookPages: empty menu still has cover + back", () => {
  const pages = buildBookPages([]);
  assert.deepEqual(pages.map((p) => p.kind), ["cover", "toc", "blank", "back"]);
});
