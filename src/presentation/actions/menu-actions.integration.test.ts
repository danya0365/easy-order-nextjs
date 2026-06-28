import { before, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";

let sessionToken: string | null = null;
const cookieStore = {
  get: (name: string) =>
    name === "es_session" && sessionToken ? { value: sessionToken } : undefined,
  set: () => {},
  delete: () => {},
};
const headerStore = new Map<string, string>([["x-forwarded-for", "203.0.113.9"]]);

mock.module("next/headers", {
  namedExports: {
    cookies: async () => cookieStore,
    headers: async () => headerStore,
  },
});
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });
mock.module("next/navigation", {
  namedExports: { redirect: () => { throw new Error("REDIRECT"); } },
});

type Actions = typeof import("./menu-actions");
let actions: Actions;

async function loginAs(userId: string): Promise<void> {
  const s = await container.sessionRepository.create({
    userId,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    userAgent: "test",
    ip: "203.0.113.9",
  });
  sessionToken = s.id;
}

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

before(async () => {
  await migrateTestDb();
  actions = await import("./menu-actions");
});
beforeEach(() => {
  sessionToken = null;
});

test("owner creates a category + item; price stored in satang", async () => {
  const { shop, ownerId } = await seedShop("menu-a");
  await loginAs(ownerId);

  assert.ok((await actions.createCategoryAction({}, form({ name: "เครื่องดื่ม" }))).success);
  const cat = (await container.menuCategoryRepository.listByShop(shop.id))[0];
  assert.equal(cat.name, "เครื่องดื่ม");

  const res = await actions.createItemAction(
    {},
    form({ categoryId: cat.id, name: "ชาเขียว", priceBaht: "45" }),
  );
  assert.ok(res.success, res.error);
  const items = await container.menuItemRepository.listByShop(shop.id);
  assert.equal(items.length, 1);
  assert.equal(items[0].priceSatang, 4500); // 45 baht → satang
});

test("unauthenticated create is rejected", async () => {
  sessionToken = null;
  const res = await actions.createCategoryAction({}, form({ name: "x" }));
  assert.ok(res.error);
});

test("an owner cannot delete another shop's category", async () => {
  const a = await seedShop("menu-b");
  const b = await seedShop("menu-c");
  const catA = await container.menuCategoryRepository.create({
    shopId: a.shop.id,
    name: "ของ A",
  });
  await loginAs(b.ownerId); // different shop's owner

  const res = await actions.deleteCategoryAction(catA.id);
  assert.ok(res.error, "cross-shop delete must fail");
  // A's category survives.
  assert.equal((await container.menuCategoryRepository.listByShop(a.shop.id)).length, 1);
});
