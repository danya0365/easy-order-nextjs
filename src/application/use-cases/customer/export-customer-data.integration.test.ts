import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { ExportCustomerDataUseCase } from "./ExportCustomerDataUseCase";

before(migrateTestDb);

function exporter() {
  return new ExportCustomerDataUseCase(
    container.shopRepository,
    container.customerRepository,
    container.orderRepository,
  );
}

async function orderFor(shopId: string, customerId: string, phone: string) {
  const cat = await container.menuCategoryRepository.create({ shopId, name: "หมวด" });
  const item = await container.menuItemRepository.create({
    shopId,
    categoryId: cat.id,
    name: "กาแฟ",
    priceSatang: 4000,
  });
  return container.orderRepository.create({
    shopId,
    paymentMethod: "cash",
    customerId,
    customerName: "ชื่อจริง",
    customerPhone: phone,
    items: [
      {
        menuItemId: item.id,
        nameSnapshot: item.name,
        unitPriceSatang: item.priceSatang,
        quantity: 2,
      },
    ],
  });
}

test("exports a customer's data (incl. orders) scoped to the shop", async () => {
  const { shop } = await seedShop("pdpa-a");
  const phone = "0820000002";
  const customer = await container.customerRepository.findOrCreate(shop.id, phone, "ชื่อจริง");
  await orderFor(shop.id, customer.id, phone);

  const data = await exporter().execute(shop.id, customer.id);
  assert.equal(data.shop.id, shop.id);
  assert.equal(data.customer.phone, phone);
  assert.equal(data.customer.id, customer.id);
  assert.equal(data.orders.length, 1);
  assert.equal(data.orders[0].totalSatang, 8000); // 2 × 4000
  assert.ok(data.exportedAt);
});

test("cannot export a customer that belongs to another shop", async () => {
  const a = await seedShop("pdpa-x");
  const b = await seedShop("pdpa-y");
  const phone = "0820000003";
  const customerA = await container.customerRepository.findOrCreate(a.shop.id, phone, null);

  // Shop B exporting A's customer id → not found (scoped by shopId).
  await assert.rejects(
    exporter().execute(b.shop.id, customerA.id),
    /ไม่พบลูกค้า/,
  );
});
