import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import {
  GetShopAnalyticsUseCase,
  normalizeRange,
} from "./GetShopAnalyticsUseCase";
import { GetPlatformAnalyticsUseCase } from "./GetPlatformAnalyticsUseCase";

before(migrateTestDb);

async function seedOrders(shopId: string, customerId: string) {
  const cat = await container.menuCategoryRepository.create({ shopId, name: "หมวด" });
  const item = await container.menuItemRepository.create({
    shopId,
    categoryId: cat.id,
    name: "ลาเต้",
    priceSatang: 5000,
  });
  const made = [];
  for (let i = 0; i < 3; i++) {
    made.push(
      await container.orderRepository.create({
        shopId,
        paymentMethod: "cash",
        customerId,
        customerName: "ลูกค้าประจำ",
        customerPhone: "0890000001",
        items: [
          {
            menuItemId: item.id,
            nameSnapshot: item.name,
            unitPriceSatang: item.priceSatang,
            quantity: 1,
          },
        ],
      }),
    );
  }
  return made;
}

test("normalizeRange clamps to an allowed window (default 30)", () => {
  assert.equal(normalizeRange(7), 7);
  assert.equal(normalizeRange(90), 90);
  assert.equal(normalizeRange(5), 30);
  assert.equal(normalizeRange("nope"), 30);
});

test("shop analytics: summary, status breakdown, top customers", async () => {
  const { shop } = await seedShop("an-a");
  const customer = await container.customerRepository.findOrCreate(
    shop.id,
    "0890000001",
    "ลูกค้าประจำ",
  );
  const made = await seedOrders(shop.id, customer.id);

  const out = await new GetShopAnalyticsUseCase(
    container.analyticsRepository,
  ).execute(shop.id, 30);

  // 3 orders × 5000 satang, one distinct customer.
  assert.equal(out.summary.orders, 3);
  assert.equal(out.summary.revenueSatang, 15000);
  assert.equal(out.summary.customers, 1);

  // All start pending → one status row.
  const pending = out.byStatus.find((r) => r.key === "pending");
  assert.equal(pending?.orders, 3);

  // Complete one → the breakdown splits.
  await container.orderRepository.setStatus(shop.id, made[0].id, "completed");
  const out2 = await new GetShopAnalyticsUseCase(
    container.analyticsRepository,
  ).execute(shop.id, 30);
  assert.equal(out2.byStatus.find((r) => r.key === "completed")?.orders, 1);
  assert.equal(out2.byStatus.find((r) => r.key === "pending")?.orders, 2);

  // Named customer surfaces in top customers with the full spend.
  const top = out2.topCustomers.find((r) => r.revenueSatang === 15000);
  assert.ok(top, "top customer present");
});

test("range cutoff excludes orders older than the window", async () => {
  const { shop } = await seedShop("an-b");
  const customer = await container.customerRepository.findOrCreate(shop.id, "0890000002", "x");
  await seedOrders(shop.id, customer.id);

  // Evaluate "now" 60 days in the future → the just-made orders fall outside a 30-day window.
  const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const out = await new GetShopAnalyticsUseCase(
    container.analyticsRepository,
  ).execute(shop.id, 30, future);
  assert.equal(out.summary.orders, 0);
  assert.equal(out.summary.revenueSatang, 0);
});

test("platform analytics aggregates orders across shops (by shop)", async () => {
  const a = await seedShop("an-pa");
  const b = await seedShop("an-pb");
  const ca = await container.customerRepository.findOrCreate(a.shop.id, "0890000003", "a");
  const cb = await container.customerRepository.findOrCreate(b.shop.id, "0890000004", "b");
  await seedOrders(a.shop.id, ca.id); // 3 × 5000
  await seedOrders(b.shop.id, cb.id); // 3 × 5000

  const out = await new GetPlatformAnalyticsUseCase(
    container.platformAnalyticsRepository,
  ).execute(90);

  // At least our two shops' 6 orders / 30000 satang are included (other tests
  // share the in-memory DB, so assert >= rather than ==).
  assert.ok(out.summary.orders >= 6, `orders ${out.summary.orders}`);
  assert.ok(out.summary.revenueSatang >= 30000);
  const shopA = out.byShop.find((r) => r.key === a.shop.id);
  assert.equal(shopA?.revenueSatang, 15000);
});
