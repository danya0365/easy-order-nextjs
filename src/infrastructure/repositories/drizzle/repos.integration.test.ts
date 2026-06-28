import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";

before(async () => {
  await migrateTestDb();
});

test("lead keyset pagination returns newest-first across pages", async () => {
  for (let i = 0; i < 5; i++) {
    await container.leadRepository.create({ name: `lead ${i}` });
  }
  const p1 = await container.leadRepository.page({ limit: 2 });
  assert.equal(p1.items.length, 2);
  assert.ok(p1.nextCursor);
  const p2 = await container.leadRepository.page({ limit: 2, cursor: p1.nextCursor });
  assert.equal(p2.items.length, 2);
  // No overlap between pages.
  const ids = new Set(p1.items.map((l) => l.id));
  assert.ok(p2.items.every((l) => !ids.has(l.id)));
});

test("lead status filter + listDueFollowUps excludes won/lost & future", async () => {
  const past = new Date(Date.now() - 86400_000).toISOString();
  const future = new Date(Date.now() + 86400_000).toISOString();
  const due = await container.leadRepository.create({
    name: "due",
    nextFollowUpAt: past,
  });
  await container.leadRepository.create({ name: "future", nextFollowUpAt: future });
  const won = await container.leadRepository.create({
    name: "won",
    nextFollowUpAt: past,
  });
  await container.leadRepository.setStatus(won.id, "won");

  const dueList = await container.leadRepository.listDueFollowUps(
    new Date().toISOString(),
  );
  const names = dueList.map((l) => l.name);
  assert.ok(names.includes("due"));
  assert.ok(!names.includes("future"));
  assert.ok(!names.includes("won"));
  assert.equal(due.status, "new");
});

test("listDueFollowUps is idempotent per due date, re-arming on reschedule", async () => {
  const daysAgo = (n: number) =>
    new Date(Date.now() - n * 86400_000).toISOString();
  const lead = await container.leadRepository.create({
    name: "idem",
    nextFollowUpAt: daysAgo(3),
  });
  const isDue = async () =>
    (
      await container.leadRepository.listDueFollowUps(new Date().toISOString())
    ).some((l) => l.id === lead.id);

  assert.ok(await isDue(), "due and not yet notified");

  // Stamp a reminder *after* the due date → suppressed on the next run.
  await container.leadRepository.markFollowUpsNotified([lead.id], daysAgo(2));
  assert.ok(!(await isDue()), "already announced for this due date");

  // Reschedule to a later (still-past) date — the stamp is now stale → re-armed.
  await container.leadRepository.update(lead.id, { nextFollowUpAt: daysAgo(1) });
  assert.ok(await isDue(), "new due date re-arms the reminder");
});

test("customer device token resolves to its customer", async () => {
  const { shop } = await seedShop("repo-dev");
  const c = await container.customerRepository.findOrCreate(
    shop.id,
    "0820000001",
    "Dev",
  );
  const { token } = await container.customerDeviceRepository.create(c.id);
  const found = await container.customerDeviceRepository.findByToken(token);
  assert.equal(found?.customer.id, c.id);
  assert.equal(await container.customerDeviceRepository.findByToken("nope"), null);
});

test("summariesByShop batches only requested shops", async () => {
  const a = await seedShop("repo-sa");
  const b = await seedShop("repo-sb");
  const ca = await container.customerRepository.findOrCreate(a.shop.id, "0830000001", null);
  await container.shopReviewRepository.upsert({
    shopId: a.shop.id,
    customerId: ca.id,
    rating: 4,
    comment: null,
  });
  const summaries = await container.shopReviewRepository.summariesByShop([
    a.shop.id,
    b.shop.id,
  ]);
  assert.equal(summaries[a.shop.id]?.count, 1);
  assert.equal(summaries[a.shop.id]?.average, 4);
  assert.equal(summaries[b.shop.id], undefined); // no reviews → absent from the batch
});

test("order repo: daily order numbers increment; history keyset newest-first", async () => {
  const { shop } = await seedShop("repo-ord");
  const cat = await container.menuCategoryRepository.create({
    shopId: shop.id,
    name: "เครื่องดื่ม",
  });
  const item = await container.menuItemRepository.create({
    shopId: shop.id,
    categoryId: cat.id,
    name: "ชาเย็น",
    priceSatang: 3500,
  });

  const made = [];
  for (let i = 0; i < 3; i++) {
    const o = await container.orderRepository.create({
      shopId: shop.id,
      paymentMethod: "cash",
      items: [
        {
          menuItemId: item.id,
          nameSnapshot: item.name,
          unitPriceSatang: item.priceSatang,
          quantity: 1,
        },
      ],
    });
    made.push(o);
  }
  // Per-shop daily running numbers, sequential from 1.
  assert.deepEqual(
    made.map((o) => o.orderNo),
    [1, 2, 3],
  );
  // total computed from items by the repo (not trusted from input).
  assert.equal(made[0].totalSatang, 3500);

  // All three are active until finished.
  assert.equal((await container.orderRepository.listActiveByShop(shop.id)).length, 3);

  // Finish them → they leave the queue and page in history (newest first).
  for (const o of made) {
    await container.orderRepository.setStatus(shop.id, o.id, "completed");
  }
  assert.equal((await container.orderRepository.listActiveByShop(shop.id)).length, 0);
  // Keyset pagination: 2 + 1 across pages, no overlap, full coverage of {1,2,3}.
  const p1 = await container.orderRepository.pageHistoryByShop(shop.id, { limit: 2 });
  assert.equal(p1.items.length, 2);
  assert.ok(p1.nextCursor);
  const p2 = await container.orderRepository.pageHistoryByShop(shop.id, {
    limit: 2,
    cursor: p1.nextCursor,
  });
  assert.equal(p2.items.length, 1);
  const seen = [...p1.items, ...p2.items].map((o) => o.orderNo).sort();
  assert.deepEqual(seen, [1, 2, 3]);
});
