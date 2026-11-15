import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { CreateMenuCategoryUseCase } from "@/src/application/use-cases/menu/CreateMenuCategoryUseCase";
import { CreateMenuItemUseCase } from "@/src/application/use-cases/menu/CreateMenuItemUseCase";
import { PlaceOrderUseCase } from "@/src/application/use-cases/order/PlaceOrderUseCase";
import { mainBranchOf } from "@/src/domain/services/branch-ordering";
import { namedBranchRows } from "@/src/domain/services/branch-report";

before(async () => {
  await migrateTestDb();
});

const c = () => container;

async function setup(slug: string) {
  const { shop } = await seedShop(slug);
  const main = mainBranchOf(await c().branchRepository.listByShop(shop.id))!;
  const b2 = await c().branchRepository.create({ shopId: shop.id, name: "สาขา 2" });
  const cat = await new CreateMenuCategoryUseCase(c().menuCategoryRepository).execute(shop.id, "อาหาร");
  const item = await new CreateMenuItemUseCase(c().menuItemRepository, c().menuCategoryRepository).execute({
    shopId: shop.id,
    categoryId: cat.id,
    name: "ข้าวมันไก่",
    priceSatang: 5000,
  });
  const place = (branchId: string | null, channel: "kiosk" | "counter" = "kiosk") =>
    new PlaceOrderUseCase(
      c().orderRepository,
      c().menuItemRepository,
      c().customerRepository,
      c().shopRepository,
      c().menuOptionRepository,
      c().platformSettingsRepository,
      c().branchRepository,
    ).execute({
      shopId: shop.id,
      paymentMethod: "cash",
      channel,
      branchId,
      cart: [{ menuItemId: item.id, quantity: 1 }],
    });
  return { shop, main, b2, item, place };
}

test("orders take the requested branch; unknown/omitted → main branch", async () => {
  const { main, b2, place } = await setup("mb-route");
  assert.equal((await place(b2.id)).branchId, b2.id);
  assert.equal((await place(null)).branchId, main.id);
  assert.equal((await place("not-a-branch-of-this-shop")).branchId, main.id);
});

test("foreign branch id never routes into another shop", async () => {
  const a = await setup("mb-tenant-a");
  const b = await setup("mb-tenant-b");
  const o = await a.place(b.b2.id);
  assert.equal(o.branchId, a.main.id);
});

test("closed / inactive branch blocks kiosk/online, counter still allowed", async () => {
  const { b2, place } = await setup("mb-closed");
  await c().branchRepository.setAcceptingOrders(b2.id, false);
  await assert.rejects(() => place(b2.id), /ปิดรับออเดอร์/);
  assert.equal((await place(b2.id, "counter")).branchId, b2.id);
  await c().branchRepository.setAcceptingOrders(b2.id, true);
  await c().branchRepository.setActive(b2.id, false);
  await assert.rejects(() => place(b2.id), /ปิดให้บริการ/);
});

test("per-branch sold-out blocks only that branch", async () => {
  const { main, b2, item, place } = await setup("mb-soldout");
  await c().branchRepository.setItemSoldOut(b2.id, item.id, true);
  assert.deepEqual(await c().branchRepository.listSoldOutItemIds(b2.id), [item.id]);
  await assert.rejects(() => place(b2.id), /หมดชั่วคราว/);
  assert.equal((await place(main.id)).branchId, main.id);
  await c().branchRepository.setItemSoldOut(b2.id, item.id, false);
  assert.equal((await place(b2.id)).branchId, b2.id);
});

test("queue + history filters by branch (main includes legacy NULL rows)", async () => {
  const { shop, main, b2, place } = await setup("mb-queue");
  await place(b2.id);
  await place(main.id);
  // Legacy order without branch (pre-migration row).
  await c().orderRepository.create({
    shopId: shop.id,
    paymentMethod: "cash",
    items: [{ menuItemId: null, nameSnapshot: "legacy", unitPriceSatang: 100, quantity: 1 }],
  });
  const all = await c().orderRepository.listActiveByShop(shop.id);
  assert.equal(all.length, 3);
  const onlyB2 = await c().orderRepository.listActiveByShop(shop.id, { branchId: b2.id });
  assert.deepEqual(onlyB2.map((o) => o.branchId), [b2.id]);
  const mainQ = await c().orderRepository.listActiveByShop(shop.id, {
    branchId: main.id,
    includeUnassigned: true,
  });
  assert.equal(mainQ.length, 2);

  // Per-branch analytics + whole-shop split.
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const s2 = await c().analyticsRepository.summary(shop.id, since, { branchId: b2.id });
  assert.equal(s2.orders, 1);
  const total = await c().analyticsRepository.summary(shop.id, since);
  assert.equal(total.orders, 3);
  const split = namedBranchRows(
    await c().analyticsRepository.byBranch(shop.id, since),
    await c().branchRepository.listByShop(shop.id),
  );
  assert.deepEqual(
    Object.fromEntries(split.map((r) => [r.key, r.orders])),
    { [main.id]: 2, [b2.id]: 1 },
  );
});
