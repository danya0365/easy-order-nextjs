import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container as c } from "@/src/infrastructure/di/container";
import { CreateMenuCategoryUseCase } from "@/src/application/use-cases/menu/CreateMenuCategoryUseCase";
import { CreateMenuItemUseCase } from "@/src/application/use-cases/menu/CreateMenuItemUseCase";
import { PlaceOrderUseCase } from "@/src/application/use-cases/order/PlaceOrderUseCase";
import { DemoDataUseCase } from "@/src/application/use-cases/admin/DemoDataUseCase";

before(async () => {
  await migrateTestDb();
});

test("demo data: seed creates labelled rows, clear removes only those", async () => {
  const { shop } = await seedShop("demo-data-shop");
  const cat = await new CreateMenuCategoryUseCase(c.menuCategoryRepository).execute(shop.id, "อาหาร");
  const item = await new CreateMenuItemUseCase(c.menuItemRepository, c.menuCategoryRepository).execute({
    shopId: shop.id, categoryId: cat.id, name: "ข้าวผัด", priceSatang: 5000,
  });
  // A real order that must survive "clear".
  const real = await new PlaceOrderUseCase(c.orderRepository, c.menuItemRepository, c.customerRepository, c.shopRepository).execute({
    shopId: shop.id, cart: [{ menuItemId: item.id, quantity: 1 }], paymentMethod: "cash",
  });

  const uc = new DemoDataUseCase(c.demoDataRepository, c.menuItemRepository, c.shopRepository);
  const seeded = await uc.seed(shop.id, { orders: 6, customers: 2, riders: 1 });
  assert.deepEqual({ o: seeded.orders, c: seeded.customers, r: seeded.riders }, { o: 6, c: 2, r: 1 });
  assert.deepEqual(await uc.counts(shop.id), { orders: 6, customers: 2, riders: 1 });

  const cleared = await uc.clear(shop.id);
  assert.equal(cleared.orders, 6);
  assert.deepEqual(await uc.counts(shop.id), { orders: 0, customers: 0, riders: 0 });
  assert.ok(await c.orderRepository.findById(shop.id, real.id), "real order kept");
});
