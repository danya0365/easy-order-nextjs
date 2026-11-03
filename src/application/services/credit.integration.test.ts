import { before, test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { db, schema } from "@/src/infrastructure/db/client";
import { PlaceOrderUseCase } from "@/src/application/use-cases/order/PlaceOrderUseCase";
import { AdvanceOrderStatusUseCase } from "@/src/application/use-cases/order/AdvanceOrderStatusUseCase";
import { CreateMenuCategoryUseCase } from "@/src/application/use-cases/menu/CreateMenuCategoryUseCase";
import { CreateMenuItemUseCase } from "@/src/application/use-cases/menu/CreateMenuItemUseCase";

before(migrateTestDb);

const credit = () => container.creditService;
const repo = () => container.creditRepository;

async function enable(over: Record<string, unknown> = {}) {
  await credit().savePlatformConfig({ enabled: true, daily: { startDate: "2026-01-01" }, ...over }, null);
}

async function shopWithItem(slug: string, priceSatang = 1000) {
  const { shop } = await seedShop(slug);
  const cat = await new CreateMenuCategoryUseCase(container.menuCategoryRepository).execute(shop.id, "อาหาร");
  const item = await new CreateMenuItemUseCase(container.menuItemRepository, container.menuCategoryRepository).execute({ shopId: shop.id, categoryId: cat.id, name: "ข้าว", priceSatang });
  return { shop, item };
}

/** Place an order (qty × ฿10), optionally complete/cancel it, and pin its createdAt. */
async function order(shopId: string, itemId: string, qty: number, at: string, to: "pending" | "completed" | "cancelled" = "completed") {
  const o = await new PlaceOrderUseCase(container.orderRepository, container.menuItemRepository, container.customerRepository, container.shopRepository).execute({
    shopId,
    paymentMethod: "cash",
    cart: [{ menuItemId: itemId, quantity: qty }],
  });
  const adv = new AdvanceOrderStatusUseCase(container.orderRepository);
  if (to === "cancelled") await adv.execute(shopId, o.id, "cancelled");
  if (to === "completed") for (const st of ["preparing", "ready", "completed"] as const) await adv.execute(shopId, o.id, st);
  await db.update(schema.orders).set({ createdAt: at }).where(eq(schema.orders.id, o.id));
  return o;
}

const DAY = "2026-10-20";
const NOW = new Date("2026-10-22T05:00:00Z");
const inDay = (hh: string) => `2026-10-20T${hh}:00.000Z`; // 02:00Z = 09:00 BKK on the 20th

test("no per-order deduction anymore: orders never touch the wallet", async () => {
  await enable();
  const { shop, item } = await shopWithItem("crd-noorder");
  await order(shop.id, item.id, 10, new Date().toISOString());
  assert.equal((await repo().pageLedger(shop.id, { page: 1, pageSize: 10 })).total, 0);
});

test("below threshold (฿40): settled, not charged", async () => {
  await enable();
  const { shop, item } = await shopWithItem("crd-below");
  await order(shop.id, item.id, 4, inDay("02:00"));
  const r = await credit().settleDay(shop.id, DAY, { now: NOW });
  assert.equal(r.created, true);
  assert.equal(r.settlement.salesSatang, 4000);
  assert.equal(r.settlement.chargedSatang, 0);
  assert.equal(await repo().getBalance(shop.id), 0);
});

test("exactly at threshold (฿50): charged ฿5", async () => {
  await enable();
  const { shop, item } = await shopWithItem("crd-at");
  await order(shop.id, item.id, 2, inDay("02:00"));
  await order(shop.id, item.id, 3, inDay("10:00"));
  const r = await credit().settleDay(shop.id, DAY, { now: NOW });
  assert.equal(r.settlement.salesSatang, 5000);
  assert.equal(r.settlement.chargedSatang, 500);
  assert.equal(await repo().getBalance(shop.id), -500);
});

test("above threshold: one ฿5 fee per day, idempotent settle", async () => {
  await enable();
  const { shop, item } = await shopWithItem("crd-above");
  await repo().applyEntry({ shopId: shop.id, type: "adjust", amountSatang: 10000, reason: "test" });
  await order(shop.id, item.id, 30, inDay("03:00"));
  const a = await credit().settleDay(shop.id, DAY, { now: NOW });
  const b = await credit().settleDay(shop.id, DAY, { now: NOW });
  const c = await Promise.all([1, 2, 3].map(() => credit().settleDay(shop.id, DAY, { now: NOW })));
  assert.equal(a.created, true);
  assert.equal(b.created, false);
  assert.ok(c.every((x) => !x.created));
  assert.equal(await repo().getBalance(shop.id), 9500);
  const led = await repo().pageLedger(shop.id, { page: 1, pageSize: 10, type: "deduction" });
  assert.equal(led.total, 1);
  assert.equal(led.items[0].idempotencyKey, `daily:${shop.id}:${DAY}`);
  assert.equal(a.settlement.ledgerEntryId, led.items[0].id);
});

test("cancelled and not-yet-completed orders are excluded", async () => {
  await enable();
  const { shop, item } = await shopWithItem("crd-cancel");
  await order(shop.id, item.id, 4, inDay("02:00")); // ฿40 completed
  await order(shop.id, item.id, 20, inDay("03:00"), "cancelled");
  await order(shop.id, item.id, 20, inDay("04:00"), "pending");
  const r = await credit().settleDay(shop.id, DAY, { now: NOW });
  assert.equal(r.settlement.salesSatang, 4000);
  assert.equal(r.settlement.orderCount, 1);
  assert.equal(r.settlement.chargedSatang, 0);
});

test("timezone boundary: 23:59 BKK counts for the day, 00:00 BKK for the next", async () => {
  await enable();
  const { shop, item } = await shopWithItem("crd-tz");
  await order(shop.id, item.id, 4, "2026-10-20T16:59:59.000Z"); // 23:59:59 BKK on the 20th → ฿40
  await order(shop.id, item.id, 1, "2026-10-20T17:00:00.000Z"); // 00:00 BKK on the 21st
  await order(shop.id, item.id, 1, "2026-10-19T16:59:59.000Z"); // 23:59:59 BKK on the 19th
  const r = await credit().settleDay(shop.id, DAY, { now: NOW });
  assert.equal(r.settlement.salesSatang, 4000);
  assert.equal(r.settlement.periodStart, "2026-10-19T17:00:00.000Z");
  assert.equal(r.settlement.periodEnd, "2026-10-20T17:00:00.000Z");
  assert.equal(r.settlement.chargedSatang, 0);
});

test("open day cannot be settled; config threshold/fee respected; exempt shop skipped", async () => {
  await enable({ daily: { thresholdSatang: 2000, feeSatang: 700, startDate: "2026-01-01" } });
  const { shop, item } = await shopWithItem("crd-cfg");
  await order(shop.id, item.id, 2, inDay("02:00"));
  await assert.rejects(credit().settleDay(shop.id, "2026-10-22", { now: NOW }), /ยังไม่ปิดรอบ/);
  const r = await credit().settleDay(shop.id, DAY, { now: NOW });
  assert.equal(r.settlement.chargedSatang, 700);
  const { shop: ex } = await shopWithItem("crd-exempt");
  await credit().saveShopOverride(ex.id, { enabled: false }, null);
  await assert.rejects(credit().settleDay(ex.id, DAY, { now: NOW }), /ยกเว้น/);
});

test("settleAllDue settles the previous days once per shop (cron)", async () => {
  await enable({ daily: { startDate: "2026-10-20" } });
  const { shop, item } = await shopWithItem("crd-cron");
  await order(shop.id, item.id, 6, inDay("02:00")); // 20th: ฿60 → charged
  await order(shop.id, item.id, 1, "2026-10-21T02:00:00.000Z"); // 21st: ฿10 → free
  await order(shop.id, item.id, 9, "2026-10-19T02:00:00.000Z"); // 19th: before startDate → never billed
  const first = await credit().settleAllDue(NOW);
  const second = await credit().settleAllDue(NOW);
  assert.equal(first.errors, 0);
  assert.ok(first.settled >= 2);
  assert.equal(second.settled, 0);
  const page = await credit().pageSettlements(shop.id, 1);
  assert.deepEqual(page.items.map((s) => [s.businessDate, s.chargedSatang]), [["2026-10-21", 0], ["2026-10-20", 500]]);
  assert.equal(await repo().getBalance(shop.id), -500);
});

test("old order-count daily fee is not charged while the wallet is active (no double charge)", async () => {
  await enable();
  const { SyncDailyFeesUseCase } = await import("@/src/application/use-cases/billing/DailyFeeUseCases");
  const fees = container.dailyFeeRepository;
  const t0 = new Date(Date.now() - 60_000);
  await fees.addTermsVersion({ shopId: null, effectiveAt: t0.toISOString(), enabled: true, threshold: 0, feeSatang: 500, cutoffTime: "00:00", createdBy: null });
  try {
    const later = new Date(Date.now() + 3 * 86400_000);
    const mk = async (slug: string) => {
      const { shop, item } = await shopWithItem(slug);
      await order(shop.id, item.id, 1, new Date(Date.now() + 86400_000).toISOString());
      return shop.id;
    };
    const walletShop = await mk("crd-legacy-w");
    const plainShop = await mk("crd-legacy-p");
    const withWallet = new SyncDailyFeesUseCase(fees, container.orderRepository, container.shopRepository, () => credit().isMasterEnabled());
    const without = new SyncDailyFeesUseCase(fees, container.orderRepository, container.shopRepository);
    assert.equal((await withWallet.execute(walletShop, later)).outstandingSatang, 0);
    assert.ok((await without.execute(plainShop, later)).outstandingSatang > 0);
  } finally {
    await fees.addTermsVersion({ shopId: null, effectiveAt: new Date().toISOString(), enabled: false, threshold: 50, feeSatang: 500, cutoffTime: "04:00", createdBy: null });
  }
});

test("topup approve credits amount + bonus once; reject needs reason", async () => {
  await enable();
  const { shop, ownerId } = await seedShop("cr-topup");
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const t = await credit().submitTopup({ shopId: shop.id, userId: ownerId, packageId: "p500", filename: "s.png", contentType: "image/png", bytes: png });
  await credit().reviewTopup(t.id, "approve", ownerId, null);
  await assert.rejects(credit().reviewTopup(t.id, "approve", ownerId, null));
  assert.equal(await repo().getBalance(shop.id), 55000);
  const t2 = await credit().submitTopup({ shopId: shop.id, userId: ownerId, amountSatang: 20000, filename: "s.png", contentType: "image/png", bytes: png });
  await assert.rejects(credit().reviewTopup(t2.id, "reject", ownerId, ""));
  assert.equal((await credit().reviewTopup(t2.id, "reject", ownerId, "ยอดไม่ตรง")).status, "rejected");
});

test("block mode closes new customer orders at <= 0; warn mode never blocks", async () => {
  await enable({ lowBalance: { mode: "block", warnSatang: 1000 } });
  const { shop } = await seedShop("crd-block");
  await assert.rejects(credit().assertCanTakeOrder(shop.id), /ปิดรับออเดอร์/);
  await repo().applyEntry({ shopId: shop.id, type: "adjust", amountSatang: 600, reason: "test" });
  await credit().assertCanTakeOrder(shop.id);
  await enable({ lowBalance: { mode: "warn" } });
  const { shop: s2 } = await seedShop("crd-warn");
  await credit().assertCanTakeOrder(s2.id);
});

test("starting credit granted once", async () => {
  await enable({ startingCreditSatang: 5000 });
  const { shop } = await seedShop("cr-start");
  await credit().grantStartingCredit(shop.id);
  await credit().grantStartingCredit(shop.id);
  assert.equal(await repo().getBalance(shop.id), 5000);
});
