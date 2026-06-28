import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { AnonymizeCustomerUseCase } from "./AnonymizeCustomerUseCase";

before(migrateTestDb);

function anonymize() {
  return new AnonymizeCustomerUseCase(
    container.customerRepository,
    container.customerDeviceRepository,
  );
}

/** Place one finished order for (shop, customer) so erasure has aggregates to preserve. */
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
        quantity: 1,
      },
    ],
  });
}

test("erasure strips PII + device bindings but keeps order aggregates", async () => {
  const { shop } = await seedShop("erase-a");
  const phone = "0830000010";
  const customer = await container.customerRepository.findOrCreate(shop.id, phone, "ชื่อจริง");
  await orderFor(shop.id, customer.id, phone);
  const { token } = await container.customerDeviceRepository.create(customer.id);

  await anonymize().execute(shop.id, customer.id);

  // PII gone: the real phone + public code + device token no longer resolve.
  assert.equal(await container.customerRepository.findByPhone(shop.id, phone), null);
  assert.equal(
    await container.customerRepository.findByPublicCode(shop.id, customer.publicCode),
    null,
  );
  assert.equal(await container.customerDeviceRepository.findByToken(token), null);

  // Row still exists (tombstoned) so order aggregates stay consistent.
  const after = (await container.customerRepository.findById(shop.id, customer.id))!;
  assert.equal(after.displayName, "(ลบข้อมูลแล้ว)");
  assert.notEqual(after.phone, phone);
  // The customer's order history is still linked (orders survive erasure).
  const orders = await container.orderRepository.pageByCustomer(shop.id, customer.id);
  assert.equal(orders.items.length, 1);
});

test("a shop cannot erase another shop's customer", async () => {
  const a = await seedShop("erase-x");
  const b = await seedShop("erase-y");
  const phone = "0830000011";
  const customerA = await container.customerRepository.findOrCreate(a.shop.id, phone, null);

  await assert.rejects(anonymize().execute(b.shop.id, customerA.id), /ไม่พบลูกค้า/);
  // A's customer is untouched.
  assert.ok(await container.customerRepository.findByPhone(a.shop.id, phone));
});
