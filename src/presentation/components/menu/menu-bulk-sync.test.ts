import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMenuBulkPatch } from "./menu-bulk-sync";

test("applyMenuBulkPatch updates and removes items", () => {
  const base = { categoryId: "c", priceSatang: 100, isAvailable: true, isRecommended: false, name: "x" };
  const items = [{ id: "a", ...base }, { id: "b", ...base }, { id: "c", ...base }];
  const out = applyMenuBulkPatch(items, {
    after: [{ id: "a", categoryId: "d", priceSatang: 110, isAvailable: false, isRecommended: true }],
    deletedIds: ["b"],
  });
  assert.deepEqual(out.map((i) => i.id), ["a", "c"]);
  assert.equal(out[0].isAvailable, false);
  assert.equal(out[0].priceSatang, 110);
  assert.equal(out[0].categoryId, "d");
  assert.equal(out[0].name, "x");
  assert.equal(out[1], items[2]);
});
