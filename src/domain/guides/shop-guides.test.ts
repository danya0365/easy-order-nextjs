import { test } from "node:test";
import assert from "node:assert/strict";
import { SHOP_GUIDES, findGuide, pageGuides } from "./shop-guides";
import { existsSync } from "node:fs";
import { join } from "node:path";

test("has 4 guides with 3-6 steps, 2-3 tips, unique slugs, existing images", () => {
    assert.equal(SHOP_GUIDES.length, 4);
    assert.equal(new Set(SHOP_GUIDES.map((g) => g.slug)).size, 4);
    for (const g of SHOP_GUIDES) {
      assert.ok(g.steps.length >= 3);
      assert.ok(g.steps.length <= 6);
      assert.ok(g.tips.length >= 2);
      assert.ok(g.tips.length <= 3);
      assert.ok(g.targetPath.startsWith("/shop"));
      for (const s of g.steps) if (s.image) assert.ok(existsSync(join(process.cwd(), "public", s.image)), s.image);
    }
  });
test("finds and paginates", () => {
    assert.equal(findGuide("manage-menu")?.targetPath, "/shop/menu");
    assert.equal(findGuide("nope"), undefined);
    assert.equal(pageGuides(99, 3).page, 2);
    assert.equal(pageGuides(1, 3).items.length, 3);
  });

