import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyShopNav } from "./shop-nav-pending";

const cur = { origin: "https://x.dev", pathname: "/s/nanara/menu", search: "" };
const k = (h: string, c = cur) => classifyShopNav(h, "nanara", c)?.kind ?? null;

test("menu item link → menuItem skeleton", () => {
  assert.equal(k("/s/nanara/menu/abc123"), "menuItem");
  assert.equal(k("https://x.dev/s/nanara/menu/abc123"), "menuItem");
});
test("shop routes map to their skeletons", () => {
  const home = { ...cur, pathname: "/s/nanara" };
  assert.equal(k("/s/nanara/menu", home), "menu");
  assert.equal(k("/s/nanara/order"), "order");
  assert.equal(k("/s/nanara/orders"), "orders");
  assert.equal(k("/s/nanara"), "home");
  assert.equal(k("/s/nanara/loyalty"), "generic");
});
test("same page / query-only / hash → null", () => {
  assert.equal(k("/s/nanara/menu?cat=x"), null);
  assert.equal(k("#top"), null);
  assert.equal(k("/s/nanara/menu?view=book"), null);
});
test("other shop, external, handlers, print → null", () => {
  assert.equal(k("/s/other/menu/abc"), null);
  assert.equal(k("https://evil.dev/s/nanara/menu/abc"), null);
  assert.equal(k("/s/nanara/enter"), null);
  assert.equal(k("/s/nanara/menu/print"), null);
  assert.equal(k("/s/nanaraX/menu"), null);
  assert.equal(k("/shop/orders"), null);
});
