import { test } from "node:test";
import assert from "node:assert/strict";

import type { MenuCategory, MenuItem } from "@/src/domain/entities";
import { selectRecommendedMenuItems } from "./recommended-menu";

function cat(over: Partial<MenuCategory> & { id: string }): MenuCategory {
  return {
    shopId: "shop-1",
    name: over.id,
    sortOrder: 0,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function item(
  over: Partial<MenuItem> & { id: string; categoryId: string },
): MenuItem {
  return {
    shopId: "shop-1",
    name: over.id,
    description: null,
    priceSatang: 1000,
    imageUrl: null,
    isAvailable: true,
    isRecommended: false,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

test("empty candidates → []", () => {
  assert.deepEqual(selectRecommendedMenuItems([], [cat({ id: "c1" })]), []);
});

test("excludes unavailable items and inactive categories", () => {
  const categories = [cat({ id: "c1" }), cat({ id: "c2", isActive: false })];
  const items = [
    item({ id: "a", categoryId: "c1", isAvailable: false, imageUrl: "x" }),
    item({ id: "b", categoryId: "c2", imageUrl: "y" }),
  ];
  assert.deepEqual(selectRecommendedMenuItems(items, categories), []);
});

test("curated path: isRecommended wins, ordered by sortOrder then createdAt, max 6", () => {
  const categories = [cat({ id: "c1" }), cat({ id: "c2" })];
  const items = [
    item({
      id: "r3",
      categoryId: "c1",
      isRecommended: true,
      sortOrder: 3,
      createdAt: "2026-01-03T00:00:00.000Z",
    }),
    item({
      id: "r1",
      categoryId: "c2",
      isRecommended: true,
      sortOrder: 1,
      createdAt: "2026-01-02T00:00:00.000Z",
    }),
    item({
      id: "r2",
      categoryId: "c1",
      isRecommended: true,
      sortOrder: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
    item({ id: "plain", categoryId: "c1", imageUrl: "img", sortOrder: 0 }),
    ...Array.from({ length: 5 }, (_, i) =>
      item({
        id: `extra-${i}`,
        categoryId: "c2",
        isRecommended: true,
        sortOrder: 10 + i,
      }),
    ),
  ];
  const picked = selectRecommendedMenuItems(items, categories);
  assert.equal(picked.length, 6);
  assert.deepEqual(
    picked.map((p) => p.id),
    ["r2", "r1", "r3", "extra-0", "extra-1", "extra-2"],
  );
  assert.ok(picked.every((p) => p.isRecommended));
});

test("fallback prefers imageUrl, then sortOrder", () => {
  const categories = [cat({ id: "c1" }), cat({ id: "c2" })];
  const items = [
    item({ id: "no-img-early", categoryId: "c1", sortOrder: 0 }),
    item({ id: "img-late", categoryId: "c2", imageUrl: "a.png", sortOrder: 5 }),
    item({ id: "img-early", categoryId: "c1", imageUrl: "b.png", sortOrder: 1 }),
  ];
  const picked = selectRecommendedMenuItems(items, categories);
  assert.deepEqual(
    picked.map((p) => p.id),
    ["img-early", "img-late", "no-img-early"],
  );
});

test("fallback diversifies ≤2 per category", () => {
  const categories = [
    cat({ id: "c1" }),
    cat({ id: "c2" }),
    cat({ id: "c3" }),
  ];
  const items = [
    ...[0, 1, 2, 3].map((i) =>
      item({
        id: `c1-${i}`,
        categoryId: "c1",
        imageUrl: "x",
        sortOrder: i,
      }),
    ),
    ...[0, 1, 2].map((i) =>
      item({
        id: `c2-${i}`,
        categoryId: "c2",
        imageUrl: "y",
        sortOrder: i,
      }),
    ),
    ...[0, 1].map((i) =>
      item({
        id: `c3-${i}`,
        categoryId: "c3",
        imageUrl: "z",
        sortOrder: i,
      }),
    ),
  ];
  const picked = selectRecommendedMenuItems(items, categories);
  assert.equal(picked.length, 6);
  const counts = Object.fromEntries(
    ["c1", "c2", "c3"].map((id) => [
      id,
      picked.filter((p) => p.categoryId === id).length,
    ]),
  );
  assert.deepEqual(counts, { c1: 2, c2: 2, c3: 2 });
  assert.deepEqual(
    picked.map((p) => p.id),
    ["c1-0", "c2-0", "c3-0", "c1-1", "c2-1", "c3-1"],
  );
});

test("fallback lifts per-category cap when no other categories left", () => {
  const categories = [cat({ id: "c1" })];
  const items = [0, 1, 2, 3, 4, 5, 6].map((i) =>
    item({
      id: `only-${i}`,
      categoryId: "c1",
      imageUrl: i < 3 ? "img" : null,
      sortOrder: i,
    }),
  );
  const picked = selectRecommendedMenuItems(items, categories);
  assert.equal(picked.length, 6);
  assert.deepEqual(
    picked.map((p) => p.id),
    ["only-0", "only-1", "only-2", "only-3", "only-4", "only-5"],
  );
});
