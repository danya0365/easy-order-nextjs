import { test } from "node:test";
import assert from "node:assert/strict";

import { osmTagsToCategorySlug, buildAddress, pickPhone } from "./osm-poi";

test("osmTagsToCategorySlug maps shop/amenity tags to our slugs", () => {
  assert.equal(osmTagsToCategorySlug({ amenity: "cafe" }), "coffee");
  assert.equal(osmTagsToCategorySlug({ shop: "coffee" }), "coffee");
  assert.equal(osmTagsToCategorySlug({ shop: "bakery" }), "bakery");
  assert.equal(osmTagsToCategorySlug({ amenity: "ice_cream" }), "bakery");
  assert.equal(osmTagsToCategorySlug({ amenity: "restaurant" }), "food");
  assert.equal(osmTagsToCategorySlug({ amenity: "fast_food" }), "food");
  assert.equal(osmTagsToCategorySlug({ amenity: "bar" }), "beverage");
  assert.equal(osmTagsToCategorySlug({ shop: "beverages" }), "beverage");
  assert.equal(osmTagsToCategorySlug({ amenity: "spa" }), "beauty");
  assert.equal(osmTagsToCategorySlug({ shop: "hairdresser" }), "beauty");
  assert.equal(osmTagsToCategorySlug({ shop: "convenience" }), "retail");
  assert.equal(osmTagsToCategorySlug({ shop: "something_else" }), "retail");
  assert.equal(osmTagsToCategorySlug({ amenity: "townhall" }), "other");
  assert.equal(osmTagsToCategorySlug({}), null);
});

test("pickPhone prefers phone then contact variants", () => {
  assert.equal(pickPhone({ phone: "02-1" }), "02-1");
  assert.equal(pickPhone({ "contact:phone": "02-2" }), "02-2");
  assert.equal(pickPhone({ mobile: "08-3" }), "08-3");
  assert.equal(pickPhone({}), null);
});

test("buildAddress composes from addr:* and caps length", () => {
  const addr = buildAddress({
    "addr:housenumber": "12",
    "addr:street": "ถนนสุขุมวิท",
    "addr:district": "วัฒนา",
    "addr:province": "กรุงเทพ",
    "addr:postcode": "10110",
  });
  assert.ok(addr && addr.includes("12 ถนนสุขุมวิท"));
  assert.ok(addr && addr.includes("10110"));
  assert.equal(buildAddress({}), null);
  assert.equal(buildAddress({ "addr:full": "x".repeat(250) })?.length, 200);
});
