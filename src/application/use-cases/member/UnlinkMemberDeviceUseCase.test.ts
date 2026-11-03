import { test } from "node:test";
import assert from "node:assert/strict";

import type { Customer } from "@/src/domain/entities";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ICustomerDeviceRepository } from "@/src/application/repositories/ICustomerDeviceRepository";
import { UnlinkMemberDeviceUseCase } from "./UnlinkMemberDeviceUseCase";

const shops = {
  async findBySlug(slug: string) {
    return slug === "a" ? { id: "shopA" } : slug === "b" ? { id: "shopB" } : null;
  },
} as unknown as IShopRepository;

function devices() {
  const deleted: string[] = [];
  const repo = {
    async findByToken(token: string) {
      return token === "tokA" ? { customer: { id: "c1", shopId: "shopA" } as Customer } : null;
    },
    async deleteByToken(token: string) {
      deleted.push(token);
    },
  } as unknown as ICustomerDeviceRepository;
  return { repo, deleted };
}

test("unlinks only this shop's device token", async () => {
  const d = devices();
  const uc = new UnlinkMemberDeviceUseCase(shops, d.repo);
  assert.equal(await uc.execute("a", null), false);
  assert.equal(await uc.execute("b", "tokA"), false); // other shop's token
  assert.equal(await uc.execute("a", "nope"), false);
  assert.deepEqual(d.deleted, []);
  assert.equal(await uc.execute("a", "tokA"), true);
  assert.deepEqual(d.deleted, ["tokA"]);
});
