import { before, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { ensurePathAliases } from "@/src/test/ensure-path-aliases";
import { container } from "@/src/infrastructure/di/container";

let sessionToken: string | null = null;
const cookieStore = {
  get: (name: string) => (name === "es_session" && sessionToken ? { value: sessionToken } : undefined),
  set: () => {},
  delete: () => {},
};
const headerStore = new Map<string, string>([["x-forwarded-for", "203.0.113.9"]]);
mock.module("next/headers", { namedExports: { cookies: async () => cookieStore, headers: async () => headerStore } });
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });
mock.module("next/navigation", { namedExports: { redirect: () => { throw new Error("REDIRECT"); } } });
ensurePathAliases();

let A: typeof import("./menu-bulk-actions");

async function loginAs(userId: string) {
  const s = await container.sessionRepository.create({
    userId, expiresAt: new Date(Date.now() + 86_400_000).toISOString(), userAgent: "t", ip: "203.0.113.9",
  });
  sessionToken = s.id;
}

async function seedMenu(slug: string) {
  const { shop, ownerId } = await seedShop(slug);
  const c1 = await container.menuCategoryRepository.create({ shopId: shop.id, name: "จานเดียว", sortOrder: 0 });
  const c2 = await container.menuCategoryRepository.create({ shopId: shop.id, name: "เครื่องดื่ม", sortOrder: 1 });
  const items = [];
  for (const [n, p] of [["ข้าวผัด", 5000], ["ข้าวมันไก่", 4500], ["ชาเย็น", 2500]] as const) {
    items.push(await container.menuItemRepository.create({ shopId: shop.id, categoryId: c1.id, name: n, priceSatang: p }));
  }
  return { shop, ownerId, c1, c2, items };
}

before(async () => {
  await migrateTestDb();
  A = await import("./menu-bulk-actions");
});
beforeEach(() => { sessionToken = null; });

const get = (id: string) => container.menuItemRepository.findById(id);

test("owner: sold-out → undo restores; audit logged", async () => {
  const { ownerId, items, shop } = await seedMenu("bulk-a");
  await loginAs(ownerId);
  const ids = items.map((i) => i.id);
  const r = await A.bulkUpdateMenuItemsAction(ids, { kind: "available", value: false });
  assert.equal(r.error, undefined);
  assert.equal(r.changed, 3);
  for (const id of ids) assert.equal((await get(id))!.isAvailable, false);
  const u = await A.undoBulkMenuItemsAction(r.undo!);
  assert.equal(u.error, undefined);
  for (const id of ids) assert.equal((await get(id))!.isAvailable, true);
  const acts = (await container.auditLogRepository.pageByShop(shop.id)).items.map((l) => l.action);
  assert.ok(acts.includes("menu_bulk_updated"));
  assert.ok(acts.includes("menu_bulk_undone"));
});

test("owner: price +10% rounded to baht, move category, recommend, negative rejected", async () => {
  const { ownerId, items, c2 } = await seedMenu("bulk-b");
  await loginAs(ownerId);
  const ids = items.map((i) => i.id);
  const r = await A.bulkUpdateMenuItemsAction(ids, { kind: "price", mode: "percent", amount: 10, rounding: "baht" });
  assert.equal(r.error, undefined);
  assert.deepEqual(await Promise.all(ids.map(async (id) => (await get(id))!.priceSatang)), [5500, 5000, 2800]);
  const neg = await A.bulkUpdateMenuItemsAction(ids, { kind: "price", mode: "baht", amount: -30, rounding: "none" });
  assert.match(neg.error ?? "", /ติดลบ/);
  // all-or-nothing: nothing changed by the rejected op
  assert.equal((await get(ids[2]))!.priceSatang, 2800);
  assert.equal((await A.bulkUpdateMenuItemsAction(ids, { kind: "category", categoryId: c2.id })).error, undefined);
  assert.equal((await get(ids[0]))!.categoryId, c2.id);
  assert.equal((await A.bulkUpdateMenuItemsAction([ids[0]], { kind: "recommended", value: true })).changed, 1);
  assert.equal((await get(ids[0]))!.isRecommended, true);
});

test("ownership: another shop's id or category → rejected, nothing written", async () => {
  const a = await seedMenu("bulk-c");
  const b = await seedMenu("bulk-d");
  await loginAs(a.ownerId);
  const r = await A.bulkUpdateMenuItemsAction([a.items[0].id, b.items[0].id], { kind: "available", value: false });
  assert.match(r.error ?? "", /ไม่อยู่ในร้านนี้/);
  assert.equal((await get(a.items[0].id))!.isAvailable, true);
  const r2 = await A.bulkUpdateMenuItemsAction([a.items[0].id], { kind: "category", categoryId: b.c2.id });
  assert.match(r2.error ?? "", /หมวดหมู่/);
  const r3 = await A.bulkUpdateMenuItemsAction(Array.from({ length: 201 }, (_, i) => `x${i}`), { kind: "available", value: false });
  assert.match(r3.error ?? "", /200/);
});

test("delete: removes only selected, no undo payload", async () => {
  const { ownerId, items } = await seedMenu("bulk-e");
  await loginAs(ownerId);
  const r = await A.bulkUpdateMenuItemsAction([items[0].id, items[1].id], { kind: "delete" });
  assert.equal(r.error, undefined);
  assert.equal(r.undo, undefined);
  assert.equal(await get(items[0].id), null);
  assert.ok(await get(items[2].id));
});

test("branch staff: may toggle availability only; unauthenticated rejected", async () => {
  const { shop, items } = await seedMenu("bulk-f");
  const staff = await container.userRepository.create({
    email: "staff-bulk@test.local", passwordHash: "x", role: "branch_staff", shopId: shop.id, branchId: null,
  });
  await loginAs(staff.id);
  const ok = await A.bulkUpdateMenuItemsAction([items[0].id], { kind: "available", value: false });
  assert.equal(ok.error, undefined);
  const no = await A.bulkUpdateMenuItemsAction([items[0].id], { kind: "price", mode: "set", amount: 1, rounding: "none" });
  assert.match(no.error ?? "", /พนักงาน/);
  const del = await A.bulkUpdateMenuItemsAction([items[0].id], { kind: "delete" });
  assert.ok(del.error);
  assert.ok(await get(items[0].id));
  sessionToken = null;
  assert.ok((await A.bulkUpdateMenuItemsAction([items[0].id], { kind: "available", value: true })).error);
});
