import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { PlaceOrderUseCase } from "@/src/application/use-cases/order/PlaceOrderUseCase";
import { AdvanceOrderStatusUseCase } from "@/src/application/use-cases/order/AdvanceOrderStatusUseCase";
import { CreateMenuCategoryUseCase } from "@/src/application/use-cases/menu/CreateMenuCategoryUseCase";
import { CreateMenuItemUseCase } from "@/src/application/use-cases/menu/CreateMenuItemUseCase";
import { CreditBlockedError } from "./CreditService";

before(migrateTestDb);

const credit = () => container.creditService;
const repo = () => container.creditRepository;

async function enable(over: Record<string, unknown> = {}) {
  await credit().savePlatformConfig({ enabled: true, ...over }, null);
}

async function shopWithItem(slug: string) {
  const { shop } = await seedShop(slug);
  const cat = await new CreateMenuCategoryUseCase(container.menuCategoryRepository).execute(shop.id, "อาหาร");
  const item = await new CreateMenuItemUseCase(container.menuItemRepository, container.menuCategoryRepository).execute({ shopId: shop.id, categoryId: cat.id, name: "ข้าว", priceSatang: 10000 });
  return { shop, item };
}

const place = (shopId: string, itemId: string, qty = 1) =>
  new PlaceOrderUseCase(container.orderRepository, container.menuItemRepository, container.customerRepository, container.shopRepository).execute({
    shopId,
    paymentMethod: "cash",
    cart: [{ menuItemId: itemId, quantity: qty }],
  });

test("disabled by default: no deduction, no block", async () => {
  const { shop, item } = await shopWithItem("cr-off");
  const o = await place(shop.id, item.id);
  await new AdvanceOrderStatusUseCase(container.orderRepository).execute(shop.id, o.id, "preparing");
  assert.equal((await repo().pageLedger(shop.id, { page: 1, pageSize: 10 })).total, 0);
});

test("deduct once on completed (idempotent) and refund once on cancel", async () => {
  await enable({ deduction: { mode: "percent", percent: 10, trigger: "accepted" }, lowBalance: { mode: "warn" } });
  const { shop, item } = await shopWithItem("cr-idem");
  await repo().applyEntry({ shopId: shop.id, type: "adjust", amountSatang: 10000, reason: "test" });
  const o = await place(shop.id, item.id, 2); // ฿200 → 10% = ฿20
  const adv = new AdvanceOrderStatusUseCase(container.orderRepository);
  await adv.execute(shop.id, o.id, "preparing");
  await adv.execute(shop.id, o.id, "ready");
  // replay the hook directly → still one deduction
  await credit().onOrderEvent({ id: o.id, shopId: shop.id, status: "ready", totalSatang: o.totalSatang, subtotalSatang: o.subtotalSatang });
  assert.equal(await repo().getBalance(shop.id), 8000);
  await adv.execute(shop.id, o.id, "cancelled");
  await credit().onOrderEvent({ id: o.id, shopId: shop.id, status: "cancelled", totalSatang: 0, subtotalSatang: 0 });
  assert.equal(await repo().getBalance(shop.id), 10000);
  const led = await repo().pageLedger(shop.id, { page: 1, pageSize: 10 });
  assert.deepEqual(led.items.map((e) => e.type), ["refund", "deduction", "adjust"]);
  assert.deepEqual(led.items.map((e) => e.balanceAfterSatang), [10000, 8000, 10000]);
});

test("concurrent duplicate applies land exactly once", async () => {
  const { shop } = await seedShop("cr-race");
  const r = await Promise.all(
    Array.from({ length: 5 }, () => repo().applyEntry({ shopId: shop.id, type: "deduction", amountSatang: -100, idempotencyKey: `deduct:race-${shop.id}` })),
  );
  assert.equal(r.filter((x) => x.applied).length, 1);
  assert.equal(await repo().getBalance(shop.id), -100);
});

test("cancel before trigger = no deduction, no refund", async () => {
  await enable({ deduction: { mode: "fixed", fixedSatang: 500, trigger: "completed" } });
  const { shop, item } = await shopWithItem("cr-early");
  const o = await place(shop.id, item.id);
  await new AdvanceOrderStatusUseCase(container.orderRepository).execute(shop.id, o.id, "cancelled");
  assert.equal((await repo().pageLedger(shop.id, { page: 1, pageSize: 10 })).total, 0);
});

test("refundOnCancel=false keeps the charge", async () => {
  await enable({ deduction: { mode: "fixed", fixedSatang: 500, trigger: "placed", refundOnCancel: false } });
  const { shop, item } = await shopWithItem("cr-norefund");
  const o = await place(shop.id, item.id);
  await new AdvanceOrderStatusUseCase(container.orderRepository).execute(shop.id, o.id, "cancelled");
  assert.equal(await repo().getBalance(shop.id), -500);
});

test("block mode stops new orders at <= 0; topup approval reopens", async () => {
  await enable({ deduction: { mode: "fixed", fixedSatang: 500, trigger: "placed" }, lowBalance: { mode: "block", warnSatang: 1000 } });
  const { shop, item, } = await shopWithItem("cr-block");
  await assert.rejects(place(shop.id, item.id), CreditBlockedError);
  await repo().applyEntry({ shopId: shop.id, type: "adjust", amountSatang: 600, reason: "test" });
  const s = await credit().getStatus(shop.id);
  assert.equal(s.gate.level, "low");
  await place(shop.id, item.id); // 600 → 100
  await place(shop.id, item.id); // 100 → -400 (allowed: balance was > 0)
  await assert.rejects(place(shop.id, item.id), CreditBlockedError);
  // per-shop exemption override
  await credit().saveShopOverride(shop.id, { enabled: false }, null);
  await place(shop.id, item.id);
  await credit().saveShopOverride(shop.id, null, null);
  assert.equal(await repo().getBalance(shop.id), -400);
});

test("grace mode allows N orders below zero", async () => {
  await enable({ deduction: { mode: "fixed", fixedSatang: 500, trigger: "placed" }, lowBalance: { mode: "grace", graceOrders: 2 } });
  const { shop, item } = await shopWithItem("cr-grace");
  await repo().applyEntry({ shopId: shop.id, type: "adjust", amountSatang: 100, reason: "test" });
  await place(shop.id, item.id); // → -400, grace 1
  await place(shop.id, item.id); // → -900, grace 2
  await assert.rejects(place(shop.id, item.id), CreditBlockedError);
});

test("free daily quota then charge", async () => {
  await enable({ deduction: { mode: "fixed", fixedSatang: 300, trigger: "placed", freePerDay: 2 }, lowBalance: { mode: "warn" } });
  const { shop, item } = await shopWithItem("cr-free");
  for (let i = 0; i < 3; i++) await place(shop.id, item.id);
  assert.equal(await repo().getBalance(shop.id), -300);
});

test("topup approve credits amount + bonus once; reject needs reason", async () => {
  await enable();
  const { shop, ownerId } = await seedShop("cr-topup");
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const t = await credit().submitTopup({ shopId: shop.id, userId: ownerId, packageId: "p500", filename: "s.png", contentType: "image/png", bytes: png });
  assert.equal(t.status, "pending");
  await credit().reviewTopup(t.id, "approve", ownerId, null);
  await assert.rejects(credit().reviewTopup(t.id, "approve", ownerId, null));
  assert.equal(await repo().getBalance(shop.id), 55000);
  const t2 = await credit().submitTopup({ shopId: shop.id, userId: ownerId, amountSatang: 20000, filename: "s.png", contentType: "image/png", bytes: png });
  await assert.rejects(credit().reviewTopup(t2.id, "reject", ownerId, ""));
  const r = await credit().reviewTopup(t2.id, "reject", ownerId, "ยอดไม่ตรง");
  assert.equal(r.status, "rejected");
  assert.equal(await repo().getBalance(shop.id), 55000);
});

test("starting credit granted once", async () => {
  await enable({ startingCreditSatang: 5000 });
  const { shop } = await seedShop("cr-start");
  await credit().grantStartingCredit(shop.id);
  await credit().grantStartingCredit(shop.id);
  assert.equal(await repo().getBalance(shop.id), 5000);
});
