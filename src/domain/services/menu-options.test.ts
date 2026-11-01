import { test } from "node:test";
import assert from "node:assert/strict";

import type { MenuOptionGroup } from "@/src/domain/entities";
import {
  normalizeOptionGroupConfig,
  normalizeOptionName,
  normalizePriceDelta,
  resolveOptionSelection,
  menuOptionsEffective,
  cartLineKey,
  parseCartLineKey,
  parseOrderLineOptions,
  formatOrderLineOptions,
} from "./menu-options";

const groups: MenuOptionGroup[] = [
  {
    id: "g1", shopId: "s", menuItemId: "i", name: "ความหวาน", isRequired: true,
    minSelect: 1, maxSelect: 1, sortOrder: 0,
    choices: [
      { id: "c1", groupId: "g1", name: "หวานน้อย", priceDeltaSatang: 0, isAvailable: true, sortOrder: 0 },
      { id: "c2", groupId: "g1", name: "หวานปกติ", priceDeltaSatang: 0, isAvailable: true, sortOrder: 1 },
    ],
  },
  {
    id: "g2", shopId: "s", menuItemId: "i", name: "ท็อปปิ้ง", isRequired: false,
    minSelect: 0, maxSelect: 2, sortOrder: 1,
    choices: [
      { id: "t1", groupId: "g2", name: "ไข่มุก", priceDeltaSatang: 1000, isAvailable: true, sortOrder: 0 },
      { id: "t2", groupId: "g2", name: "วุ้น", priceDeltaSatang: 500, isAvailable: true, sortOrder: 1 },
      { id: "t3", groupId: "g2", name: "พุดดิ้ง", priceDeltaSatang: 1500, isAvailable: false, sortOrder: 2 },
    ],
  },
];

test("group config: required forces min>=1, optional forces min=0", () => {
  assert.deepEqual(normalizeOptionGroupConfig({ name: " ขนาด ", isRequired: true, minSelect: 0, maxSelect: 1 }),
    { name: "ขนาด", isRequired: true, minSelect: 1, maxSelect: 1 });
  assert.deepEqual(normalizeOptionGroupConfig({ name: "เพิ่ม", isRequired: false, minSelect: 2, maxSelect: 3 }),
    { name: "เพิ่ม", isRequired: false, minSelect: 0, maxSelect: 3 });
  assert.throws(() => normalizeOptionGroupConfig({ name: "x", isRequired: true, minSelect: 3, maxSelect: 2 }));
  assert.throws(() => normalizeOptionGroupConfig({ name: "x", isRequired: false, minSelect: 0, maxSelect: 0 }));
  assert.throws(() => normalizeOptionGroupConfig({ name: "", isRequired: false, minSelect: 0, maxSelect: 1 }));
});

test("halal assertion on option names", () => {
  assert.throws(() => normalizeOptionName("เพิ่มเบคอน"));
  assert.throws(() => normalizeOptionGroupConfig({ name: "ใส่เหล้า", isRequired: false, minSelect: 0, maxSelect: 1 }));
  assert.equal(normalizeOptionName("ไข่ดาว"), "ไข่ดาว");
});

test("price delta bounds", () => {
  assert.equal(normalizePriceDelta(1000), 1000);
  assert.throws(() => normalizePriceDelta(-1));
  assert.throws(() => normalizePriceDelta(1_000_001));
});

test("resolve: computes delta + snapshot in group/choice order", () => {
  const r = resolveOptionSelection("ชาไทย", groups, ["t2", "c1", "t1"]);
  assert.equal(r.deltaSatang, 1500);
  assert.deepEqual(r.options.map((o) => o.choice), ["หวานน้อย", "ไข่มุก", "วุ้น"]);
});

test("resolve: required missing / over max / unknown / unavailable / dup", () => {
  assert.throws(() => resolveOptionSelection("ชา", groups, []), /ความหวาน/);
  assert.throws(() => resolveOptionSelection("ชา", groups, ["c1", "c2"]), /ไม่เกิน 1/);
  assert.throws(() => resolveOptionSelection("ชา", groups, ["c1", "zzz"]));
  assert.throws(() => resolveOptionSelection("ชา", groups, ["c1", "t3"]), /หมด/);
  assert.throws(() => resolveOptionSelection("ชา", groups, ["c1", "c1"]));
});

test("resolve: no groups + no ids is a no-op", () => {
  assert.deepEqual(resolveOptionSelection("x", [], []), { deltaSatang: 0, options: [] });
});

test("effective switch + cart keys + snapshot parse/format", () => {
  assert.equal(menuOptionsEffective(true, true), true);
  assert.equal(menuOptionsEffective(true, false), false);
  assert.equal(menuOptionsEffective(false, true), false);
  assert.equal(cartLineKey("i", []), "i");
  assert.equal(cartLineKey("i", ["b", "a"]), "i|a,b");
  assert.deepEqual(parseCartLineKey("i|a,b"), { menuItemId: "i", choiceIds: ["a", "b"] });
  assert.deepEqual(parseCartLineKey("i"), { menuItemId: "i", choiceIds: [] });
  assert.deepEqual(parseOrderLineOptions("not json"), []);
  const opts = parseOrderLineOptions(JSON.stringify([{ group: "g", choice: "ไข่มุก", priceDeltaSatang: 1000 }]));
  assert.equal(formatOrderLineOptions(opts), "ไข่มุก (+฿10)");
});
