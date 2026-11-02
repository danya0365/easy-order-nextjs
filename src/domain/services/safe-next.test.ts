import { test } from "node:test";
import assert from "node:assert/strict";

import { loginUrlFor, safeNextPath } from "./safe-next";

test("safeNextPath: allows same-origin paths in the role area", () => {
  assert.equal(safeNextPath("/shop/menu?bulk=1", "shop_owner"), "/shop/menu?bulk=1");
  assert.equal(safeNextPath("/shop", "shop_owner"), "/shop");
  assert.equal(safeNextPath("/staff/orders", "branch_staff"), "/staff/orders");
  assert.equal(safeNextPath("/shop/loyalty", "platform_admin"), "/shop/loyalty");
});

test("safeNextPath: rejects open redirects and foreign areas", () => {
  for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "\\\\evil", "javascript:alert(1)", "/shop\n", "", "shop", "/login?next=/shop", 42, null]) {
    assert.equal(safeNextPath(bad as unknown, "shop_owner"), null, String(bad));
  }
  assert.equal(safeNextPath("/admin/users", "shop_owner"), null);
  assert.equal(safeNextPath("/shop/menu", "branch_staff"), null);
  assert.equal(safeNextPath("/shopx", "shop_owner"), null);
});

test("loginUrlFor: encodes a safe next", () => {
  assert.equal(loginUrlFor("/shop/guides/open-close"), "/login?next=%2Fshop%2Fguides%2Fopen-close");
  assert.equal(loginUrlFor("//evil.com"), "/login");
  assert.equal(loginUrlFor(null), "/login");
});
