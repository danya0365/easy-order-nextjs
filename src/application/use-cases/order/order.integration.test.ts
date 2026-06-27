import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { CreateMenuCategoryUseCase } from "@/src/application/use-cases/menu/CreateMenuCategoryUseCase";
import { CreateMenuItemUseCase } from "@/src/application/use-cases/menu/CreateMenuItemUseCase";
import { GetKioskMenuUseCase } from "@/src/application/use-cases/menu/GetKioskMenuUseCase";
import { PlaceOrderUseCase } from "@/src/application/use-cases/order/PlaceOrderUseCase";
import { AdvanceOrderStatusUseCase } from "@/src/application/use-cases/order/AdvanceOrderStatusUseCase";
import { ConfirmOrderPaymentUseCase } from "@/src/application/use-cases/order/ConfirmOrderPaymentUseCase";

before(async () => {
  await migrateTestDb();
});

const cats = () => container.menuCategoryRepository;
const items = () => container.menuItemRepository;
const orders = () => container.orderRepository;
const customers = () => container.customerRepository;

async function seedMenu(shopId: string) {
  const cat = await new CreateMenuCategoryUseCase(cats()).execute(
    shopId,
    "เครื่องดื่ม",
  );
  const espresso = await new CreateMenuItemUseCase(items(), cats()).execute({
    shopId,
    categoryId: cat.id,
    name: "เอสเพรสโซ",
    priceSatang: 5000,
  });
  const latte = await new CreateMenuItemUseCase(items(), cats()).execute({
    shopId,
    categoryId: cat.id,
    name: "ลาเต้",
    priceSatang: 6500,
  });
  return { cat, espresso, latte };
}

test("place order computes totals from the menu (ignores client prices)", async () => {
  const { shop } = await seedShop("ord-totals");
  const { espresso, latte } = await seedMenu(shop.id);

  const order = await new PlaceOrderUseCase(orders(), items(), customers()).execute({
    shopId: shop.id,
    paymentMethod: "cash",
    cart: [
      { menuItemId: espresso.id, quantity: 2 },
      { menuItemId: latte.id, quantity: 1 },
    ],
  });

  assert.equal(order.totalSatang, 5000 * 2 + 6500, "server-trusted total");
  assert.equal(order.items.length, 2);
  assert.equal(order.orderNo, 1, "first order of the day");
  assert.equal(order.paymentStatus, "unpaid");
  assert.equal(order.status, "pending");
});

test("order number increments per shop", async () => {
  const { shop } = await seedShop("ord-seq");
  const { espresso } = await seedMenu(shop.id);
  const mk = () =>
    new PlaceOrderUseCase(orders(), items(), customers()).execute({
      shopId: shop.id,
      paymentMethod: "cash",
      cart: [{ menuItemId: espresso.id, quantity: 1 }],
    });
  const a = await mk();
  const b = await mk();
  assert.equal(a.orderNo, 1);
  assert.equal(b.orderNo, 2);
});

test("cannot order an unavailable item, an empty cart, or another shop's item", async () => {
  const { shop } = await seedShop("ord-guard");
  const other = await seedShop("ord-other");
  const { espresso } = await seedMenu(shop.id);
  const otherMenu = await seedMenu(other.shop.id);

  await assert.rejects(
    new PlaceOrderUseCase(orders(), items(), customers()).execute({
      shopId: shop.id,
      paymentMethod: "cash",
      cart: [],
    }),
    /ยังไม่ได้เลือกเมนู/,
  );

  // Cross-tenant: shop cannot order an item that belongs to another shop.
  await assert.rejects(
    new PlaceOrderUseCase(orders(), items(), customers()).execute({
      shopId: shop.id,
      paymentMethod: "cash",
      cart: [{ menuItemId: otherMenu.espresso.id, quantity: 1 }],
    }),
    /ไม่พบเมนู/,
  );

  await items().update(espresso.id, { isAvailable: false });
  await assert.rejects(
    new PlaceOrderUseCase(orders(), items(), customers()).execute({
      shopId: shop.id,
      paymentMethod: "cash",
      cart: [{ menuItemId: espresso.id, quantity: 1 }],
    }),
    /หมดชั่วคราว/,
  );
});

test("status advances forward only; payment confirm flips to paid", async () => {
  const { shop } = await seedShop("ord-status");
  const { espresso } = await seedMenu(shop.id);
  const order = await new PlaceOrderUseCase(orders(), items(), customers()).execute({
    shopId: shop.id,
    paymentMethod: "promptpay_qr",
    cart: [{ menuItemId: espresso.id, quantity: 1 }],
  });

  // pending -> ready is not allowed (must go through preparing).
  await assert.rejects(
    new AdvanceOrderStatusUseCase(orders()).execute(shop.id, order.id, "ready"),
    /เปลี่ยนสถานะ/,
  );

  const prep = await new AdvanceOrderStatusUseCase(orders()).execute(
    shop.id,
    order.id,
    "preparing",
  );
  assert.equal(prep.status, "preparing");

  const paid = await new ConfirmOrderPaymentUseCase(orders()).execute(
    shop.id,
    order.id,
  );
  assert.equal(paid.paymentStatus, "paid");
  assert.ok(paid.paidAt, "paidAt stamped");

  // Active queue holds open orders only.
  const active = await orders().listActiveByShop(shop.id);
  assert.equal(active.length, 1);

  await new AdvanceOrderStatusUseCase(orders()).execute(shop.id, order.id, "ready");
  const done = await new AdvanceOrderStatusUseCase(orders()).execute(
    shop.id,
    order.id,
    "completed",
  );
  assert.equal(done.status, "completed");
  assert.ok(done.completedAt);

  const stillActive = await orders().listActiveByShop(shop.id);
  assert.equal(stillActive.length, 0, "completed order leaves the queue");
});

test("kiosk menu hides inactive categories and empty/unavailable items", async () => {
  const { shop } = await seedShop("ord-kiosk-menu");
  const { cat, espresso } = await seedMenu(shop.id);
  // An empty category should not surface.
  await new CreateMenuCategoryUseCase(cats()).execute(shop.id, "ของหวาน");

  let menu = await new GetKioskMenuUseCase(cats(), items()).execute(shop.id);
  assert.equal(menu.length, 1, "only the drinks category with items shows");
  assert.equal(menu[0].category.id, cat.id);
  assert.equal(menu[0].items.length, 2);

  // Hiding one item drops it from the kiosk view.
  await items().update(espresso.id, { isAvailable: false });
  menu = await new GetKioskMenuUseCase(cats(), items()).execute(shop.id);
  assert.equal(menu[0].items.length, 1);
});

test("order with a phone ties to a per-shop customer; same phone reuses it", async () => {
  const { shop } = await seedShop("ord-cust");
  const { espresso } = await seedMenu(shop.id);
  const place = (customerName: string | null, customerPhone: string | null) =>
    new PlaceOrderUseCase(orders(), items(), customers()).execute({
      shopId: shop.id,
      paymentMethod: "cash",
      customerName,
      customerPhone,
      cart: [{ menuItemId: espresso.id, quantity: 1 }],
    });

  const first = await place("สมชาย", "081-234-5678");
  assert.ok(first.customerId, "order linked to a customer");
  assert.equal(first.customerName, "สมชาย");
  assert.equal(first.customerPhone, "0812345678", "phone normalized to digits");

  // Same phone (different formatting) reuses the same customer row.
  const second = await place(null, "0812345678");
  assert.equal(second.customerId, first.customerId, "same customer reused");

  // The customer's self-service history returns both orders, newest first.
  const history = await orders().pageByCustomer(shop.id, first.customerId!);
  assert.equal(history.items.length, 2);
  assert.equal(history.items[0].id, second.id);

  const customer = await customers().findByPhone(shop.id, "0812345678");
  assert.equal(customer?.displayName, "สมชาย", "name backfilled from first order");
});

test("walk-in order without a phone stays anonymous; bad phone is rejected", async () => {
  const { shop } = await seedShop("ord-anon");
  const { espresso } = await seedMenu(shop.id);

  const anon = await new PlaceOrderUseCase(orders(), items(), customers()).execute({
    shopId: shop.id,
    paymentMethod: "cash",
    cart: [{ menuItemId: espresso.id, quantity: 1 }],
  });
  assert.equal(anon.customerId, null);
  assert.equal(anon.customerPhone, null);

  await assert.rejects(
    new PlaceOrderUseCase(orders(), items(), customers()).execute({
      shopId: shop.id,
      paymentMethod: "cash",
      customerPhone: "123", // too short for a Thai number
      cart: [{ menuItemId: espresso.id, quantity: 1 }],
    }),
    /เบอร์โทรไม่ถูกต้อง/,
  );
});

test("customers are tenant-isolated by (shop, phone)", async () => {
  const a = await seedShop("ord-cust-iso-a");
  const b = await seedShop("ord-cust-iso-b");
  const menuA = await seedMenu(a.shop.id);
  const menuB = await seedMenu(b.shop.id);
  const oa = await new PlaceOrderUseCase(orders(), items(), customers()).execute({
    shopId: a.shop.id,
    paymentMethod: "cash",
    customerPhone: "0900000000",
    cart: [{ menuItemId: menuA.espresso.id, quantity: 1 }],
  });
  const ob = await new PlaceOrderUseCase(orders(), items(), customers()).execute({
    shopId: b.shop.id,
    paymentMethod: "cash",
    customerPhone: "0900000000", // same phone, different shop
    cart: [{ menuItemId: menuB.espresso.id, quantity: 1 }],
  });
  assert.notEqual(oa.customerId, ob.customerId, "same phone = distinct customer per shop");
});

test("orders are tenant-isolated", async () => {
  const a = await seedShop("ord-iso-a");
  const b = await seedShop("ord-iso-b");
  const menuA = await seedMenu(a.shop.id);
  const order = await new PlaceOrderUseCase(orders(), items(), customers()).execute({
    shopId: a.shop.id,
    paymentMethod: "cash",
    cart: [{ menuItemId: menuA.espresso.id, quantity: 1 }],
  });
  // Shop B cannot read or mutate shop A's order.
  assert.equal(await orders().findById(b.shop.id, order.id), null);
  await assert.rejects(
    new AdvanceOrderStatusUseCase(orders()).execute(b.shop.id, order.id, "preparing"),
  );
});
