import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";

/**
 * Negative multi-tenant tests: one shop must never see or touch another shop's
 * data. This guards the semantic rule "every query is scoped by shopId" that the
 * import-graph linter can't see — if a repo drops its shopId filter, a test here
 * goes red.
 */

before(migrateTestDb);

const customers = () => container.customerRepository;
const orders = () => container.orderRepository;
const cats = () => container.menuCategoryRepository;
const items = () => container.menuItemRepository;
const reviews = () => container.shopReviewRepository;
const kiosks = () => container.kioskSessionRepository;

const PHONE = "0810000001";

/**
 * Seed shop A with a customer (PHONE) + a menu item + one order for that
 * customer, plus an empty shop B. `tag` makes slugs unique per test (the
 * in-memory DB is shared across the file).
 */
async function seedTwoShops(tag: string) {
  const a = await seedShop(`iso-a-${tag}`);
  const b = await seedShop(`iso-b-${tag}`);

  const customerA = await customers().findOrCreate(a.shop.id, PHONE, "ลูกค้า A");
  const catA = await cats().create({ shopId: a.shop.id, name: "เครื่องดื่ม" });
  const itemA = await items().create({
    shopId: a.shop.id,
    categoryId: catA.id,
    name: "เอสเพรสโซ",
    priceSatang: 5000,
  });
  const orderA = await orders().create({
    shopId: a.shop.id,
    paymentMethod: "cash",
    customerId: customerA.id,
    customerName: "ลูกค้า A",
    customerPhone: PHONE,
    performedBy: a.ownerId,
    items: [
      {
        menuItemId: itemA.id,
        nameSnapshot: itemA.name,
        unitPriceSatang: itemA.priceSatang,
        quantity: 2,
      },
    ],
  });
  return { a, b, customerA, catA, itemA, orderA };
}

test("customer lookups are scoped: B cannot see A's customer", async () => {
  const { a, b, customerA } = await seedTwoShops("cust");

  // Positive control: A sees its own customer.
  assert.ok(await customers().findByPhone(a.shop.id, PHONE));
  assert.ok(await customers().findById(a.shop.id, customerA.id));

  // B sees nothing for the same phone / public code / id / list.
  assert.equal(await customers().findByPhone(b.shop.id, PHONE), null);
  assert.equal(
    await customers().findByPublicCode(b.shop.id, customerA.publicCode),
    null,
  );
  assert.equal(await customers().findById(b.shop.id, customerA.id), null);
  assert.equal((await customers().listByShop(b.shop.id)).length, 0);
});

test("orders are scoped: A's order is invisible under shop B", async () => {
  const { a, b, customerA, orderA } = await seedTwoShops("order");

  // Positive control: the order exists + is queryable under A.
  assert.ok(await orders().findById(a.shop.id, orderA.id));
  assert.equal((await orders().listActiveByShop(a.shop.id)).length, 1);
  assert.equal(
    (await orders().pageByCustomer(a.shop.id, customerA.id)).items.length,
    1,
  );

  // Forging A's orderId / customerId under shop B yields nothing.
  assert.equal(await orders().findById(b.shop.id, orderA.id), null);
  assert.equal((await orders().listActiveByShop(b.shop.id)).length, 0);
  assert.equal(
    (await orders().pageByCustomer(b.shop.id, customerA.id)).items.length,
    0,
  );
});

test("menu is scoped: B only lists its own categories/items", async () => {
  const { a, b } = await seedTwoShops("menu");

  // A has one category + one item; B has none.
  assert.equal((await cats().listByShop(a.shop.id)).length, 1);
  assert.equal((await items().listByShop(a.shop.id)).length, 1);
  assert.equal((await cats().listByShop(b.shop.id)).length, 0);
  assert.equal((await items().listByShop(b.shop.id)).length, 0);
  assert.equal((await items().listAvailableByShop(b.shop.id)).length, 0);
});

test("reviews are scoped: a review in A is absent from B", async () => {
  const { a, b, customerA } = await seedTwoShops("review");
  await reviews().upsert({
    shopId: a.shop.id,
    customerId: customerA.id,
    rating: 5,
    comment: null,
  });

  assert.equal((await reviews().pageByShop(a.shop.id)).items.length, 1);
  assert.equal((await reviews().pageByShop(b.shop.id)).items.length, 0);
  assert.equal((await reviews().summary(a.shop.id)).count, 1);
  assert.equal((await reviews().summary(b.shop.id)).count, 0);
});

test("kiosk sessions are scoped: B does not list A's device", async () => {
  const { a, b } = await seedTwoShops("kiosk");
  const future = new Date(Date.now() + 3600_000).toISOString();
  await kiosks().create({ shopId: a.shop.id, label: "iPad A", expiresAt: future });

  assert.equal((await kiosks().listByShop(a.shop.id)).length, 1);
  assert.equal((await kiosks().listByShop(b.shop.id)).length, 0);
});

test("same phone in another shop is a separate customer", async () => {
  const { a, b, customerA } = await seedTwoShops("phone");

  // findOrCreate in shop B for the same phone → a brand-new, independent row.
  const customerB = await customers().findOrCreate(b.shop.id, PHONE, "ลูกค้า B");
  assert.notEqual(customerB.id, customerA.id);

  // A's customer + its order are untouched by activity in B.
  assert.ok(await customers().findById(a.shop.id, customerA.id));
  assert.equal(
    (await orders().pageByCustomer(a.shop.id, customerA.id)).items.length,
    1,
  );
});
