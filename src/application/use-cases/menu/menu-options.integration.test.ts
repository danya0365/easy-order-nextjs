import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { CreateMenuCategoryUseCase } from "@/src/application/use-cases/menu/CreateMenuCategoryUseCase";
import { CreateMenuItemUseCase } from "@/src/application/use-cases/menu/CreateMenuItemUseCase";
import { ManageMenuOptionsUseCase } from "@/src/application/use-cases/menu/MenuOptionUseCases";
import { PlaceOrderUseCase } from "@/src/application/use-cases/order/PlaceOrderUseCase";

before(async () => {
  await migrateTestDb();
});

const c = container;
const manage = () =>
  new ManageMenuOptionsUseCase(c.menuOptionRepository, c.menuItemRepository, c.shopRepository, c.platformSettingsRepository);
const place = () =>
  new PlaceOrderUseCase(c.orderRepository, c.menuItemRepository, c.customerRepository, c.shopRepository, c.menuOptionRepository, c.platformSettingsRepository);

async function seed(slug: string) {
  const { shop } = await seedShop(slug);
  const cat = await new CreateMenuCategoryUseCase(c.menuCategoryRepository).execute(shop.id, "เครื่องดื่ม");
  const tea = await new CreateMenuItemUseCase(c.menuItemRepository, c.menuCategoryRepository).execute({
    shopId: shop.id, categoryId: cat.id, name: "ชาไทย", priceSatang: 4000,
  });
  return { shop, tea };
}

test("defaults: options off platform-wide and per shop; item detail on", async () => {
  const s = await c.platformSettingsRepository.get();
  assert.equal(s.menuOptionsEnabled, false);
  assert.equal(s.itemDetailEnabled, true);
  const { shop, tea } = await seed("opt-default");
  assert.equal(shop.menuOptionsAllowedByAdmin, false);
  await assert.rejects(() => manage().createGroup(shop.id, tea.id, { name: "หวาน", isRequired: true, minSelect: 1, maxSelect: 1 }), /ยังไม่เปิด/);
});

test("needs BOTH platform + shop switch; order price computed server-side with snapshot", async () => {
  const { shop, tea } = await seed("opt-on");
  await c.platformSettingsRepository.update({ menuOptionsEnabled: true });
  await assert.rejects(() => manage().createGroup(shop.id, tea.id, { name: "หวาน", isRequired: true, minSelect: 1, maxSelect: 1 }));
  await c.shopRepository.setMenuOptionsAllowedByAdmin(shop.id, true);

  const sweet = await manage().createGroup(shop.id, tea.id, { name: "ความหวาน", isRequired: true, minSelect: 1, maxSelect: 1 });
  const less = await manage().addChoice(shop.id, sweet.id, { name: "หวานน้อย", priceDeltaSatang: 0 });
  const top = await manage().createGroup(shop.id, tea.id, { name: "ท็อปปิ้ง", isRequired: false, minSelect: 0, maxSelect: 2 });
  const pearl = await manage().addChoice(shop.id, top.id, { name: "ไข่มุก", priceDeltaSatang: 1000 });
  await assert.rejects(() => manage().addChoice(shop.id, top.id, { name: "เบคอน", priceDeltaSatang: 0 }), /ฮาลาล/);

  // required group missing → rejected
  await assert.rejects(() => place().execute({ shopId: shop.id, paymentMethod: "cash", cart: [{ menuItemId: tea.id, quantity: 1 }] }), /ความหวาน/);

  const order = await place().execute({
    shopId: shop.id, paymentMethod: "cash",
    cart: [{ menuItemId: tea.id, quantity: 2, optionChoiceIds: [less.id, pearl.id] }],
  });
  assert.equal(order.items[0].unitPriceSatang, 5000);
  assert.equal(order.totalSatang, 10000);
  assert.deepEqual(order.items[0].options.map((o) => o.choice), ["หวานน้อย", "ไข่มุก"]);
  const reread = await c.orderRepository.findById(shop.id, order.id);
  assert.equal(reread?.items[0].options.length, 2);

  // other shop can't touch this group
  const { shop: other } = await seed("opt-other");
  await c.shopRepository.setMenuOptionsAllowedByAdmin(other.id, true);
  await assert.rejects(() => manage().deleteGroup(other.id, sweet.id), /ไม่พบ/);

  // switch off at platform → options ignored, base price, no enforcement
  await c.platformSettingsRepository.update({ menuOptionsEnabled: false });
  const plain = await place().execute({ shopId: shop.id, paymentMethod: "cash", cart: [{ menuItemId: tea.id, quantity: 1, optionChoiceIds: [pearl.id] }] });
  assert.equal(plain.totalSatang, 4000);
  assert.equal(plain.items[0].options.length, 0);
});
