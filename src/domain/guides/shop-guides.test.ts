import { test } from "node:test";
import assert from "node:assert/strict";
import { SHOP_GUIDES, TRAINING_GROUPS, findGuide, pageGuides } from "./shop-guides";
import { existsSync } from "node:fs";
import { join } from "node:path";

test("has 10 guides with 3-6 steps, 2-3 tips, unique slugs, existing images", () => {
    assert.equal(SHOP_GUIDES.length, 10);
    assert.equal(new Set(SHOP_GUIDES.map((g) => g.slug)).size, 10);
    for (const g of SHOP_GUIDES) {
      assert.ok(g.steps.length >= 3);
      assert.ok(g.steps.length <= 6);
      assert.ok(g.tips.length >= 2);
      assert.ok(g.tips.length <= 3);
      assert.ok(g.qr !== undefined || g.targetPath.startsWith("/shop"));
      for (const s of g.steps) if (s.image) assert.ok(existsSync(join(process.cwd(), "public", s.image)), s.image);
    }
  });
test("finds and paginates", () => {
    assert.equal(findGuide("manage-menu")?.targetPath, "/shop/menu");
    assert.equal(findGuide("nope"), undefined);
    assert.equal(pageGuides(99, 4).page, 3);
    assert.equal(pageGuides(1, 3).items.length, 3);
  });

test("customer order guide uses the order-enter QR", () => {
    const g = findGuide("customer-order");
    assert.ok(g);
    assert.deepEqual(g.audience, ["customer"]);
    assert.equal(g.qr, "order-enter");
    assert.equal(g.steps.length, 6);
  });
test("manage-orders guide targets the order queue", () => {
    const g = findGuide("manage-orders");
    assert.equal(g?.targetPath, "/shop/orders");
    assert.equal(g?.steps.length, 6);
  });
test("training checklist covers every guide exactly once", () => {
    const all = TRAINING_GROUPS.flatMap((g) => g.slugs);
    assert.equal(all.length, SHOP_GUIDES.length);
    assert.deepEqual([...all].sort(), SHOP_GUIDES.map((g) => g.slug).sort());
  });
test("rider guide never prints a QR", () => {
    const g = findGuide("rider-guide");
    assert.equal(g?.qr, "none");
    assert.deepEqual(g?.audience, ["rider"]);
  });
