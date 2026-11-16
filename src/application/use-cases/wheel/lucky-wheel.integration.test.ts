import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { LuckyWheelService } from "@/src/application/use-cases/wheel/LuckyWheelUseCases";
import { PlaceOrderUseCase } from "@/src/application/use-cases/order/PlaceOrderUseCase";

before(async () => {
  await migrateTestDb();
});

const c = () => container;

function svc(opts: { rand?: (max: number) => number; now?: Date } = {}) {
  return new LuckyWheelService({
    wheel: c().luckyWheelRepository,
    shops: c().shopRepository,
    platform: c().platformSettingsRepository,
    balances: c().loyaltyPointsBalanceRepository,
    pointsTx: c().loyaltyPointsTransactionRepository,
    orders: c().orderRepository,
    randomInt: opts.rand,
    now: opts.now ? () => opts.now! : undefined,
  });
}

async function setup(slug: string, points = true) {
  const { shop } = await seedShop(slug);
  await c().shopRepository.setLoyaltyAllowedByAdmin(shop.id, true);
  await c().shopRepository.updateSettings(shop.id, { loyaltyEnabled: true, spendPointsEnabled: points });
  const cat = await c().menuCategoryRepository.create({ shopId: shop.id, name: "หมวด" });
  const item = await c().menuItemRepository.create({ shopId: shop.id, categoryId: cat.id, name: "ข้าว", priceSatang: 10000 });
  const customer = await c().customerRepository.findOrCreate(shop.id, "0812345678", "สมาชิก");
  const place = (customerPhone: string | null = "0812345678", channel: "kiosk" | "counter" = "counter") =>
    new PlaceOrderUseCase(
      c().orderRepository,
      c().menuItemRepository,
      c().customerRepository,
      c().shopRepository,
      c().menuOptionRepository,
      c().platformSettingsRepository,
      c().branchRepository,
    ).execute({
      shopId: shop.id,
      paymentMethod: "cash",
      channel,
      customerPhone,
      cart: [{ menuItemId: item.id, quantity: 1 }],
    });
  return { shop, item, customer, place };
}

async function withPrizes(s: LuckyWheelService, shopId: string, itemId: string) {
  const gift = await s.savePrize(shopId, null, { type: "gift", name: "แก้วน้ำ", weight: 1, stock: 1, dailyCap: null, pointsAmount: null, menuItemId: null, costSatang: 5000, isActive: true, sortOrder: 0 });
  const pts = await s.savePrize(shopId, null, { type: "points", name: "10 แต้ม", weight: 1, stock: null, dailyCap: null, pointsAmount: 10, menuItemId: null, costSatang: 0, isActive: true, sortOrder: 1 });
  const free = await s.savePrize(shopId, null, { type: "free_item", name: "ข้าวฟรี", weight: 1, stock: null, dailyCap: 1, pointsAmount: null, menuItemId: itemId, costSatang: 3000, isActive: true, sortOrder: 2 });
  return { gift, pts, free };
}

test("cannot enable without prizes; coupon types rejected in phase 1", async () => {
  const { shop } = await setup("lw-gate");
  const s = svc();
  await assert.rejects(() => s.updateCampaign(shop.id, { isActive: true }), /อย่างน้อย 1/);
  await assert.rejects(
    () => s.savePrize(shop.id, null, { type: "coupon_percent", name: "ลด 10%", weight: 1, stock: null, dailyCap: null, pointsAmount: null, menuItemId: null, costSatang: 0, isActive: true, sortOrder: 0 }),
    /เฟส 2/,
  );
});

test("points prize needs the shop points ledger", async () => {
  const { shop } = await setup("lw-nopoints", false);
  await assert.rejects(
    () => svc().savePrize(shop.id, null, { type: "points", name: "5 แต้ม", weight: 1, stock: null, dailyCap: null, pointsAmount: 5, menuItemId: null, costSatang: 0, isActive: true, sortOrder: 0 }),
    /สะสมแต้ม/,
  );
});

test("paid order grants tickets once; cancel revokes unused; one ticket = one spin", async () => {
  const { shop, item, customer, place } = await setup("lw-flow");
  const s = svc({ rand: () => 0 }); // always the first eligible prize
  const { gift, pts } = await withPrizes(s, shop.id, item.id);
  await s.updateCampaign(shop.id, { isActive: true, ticketsPerOrder: 2, minOrderSatang: 5000 });

  const o1 = await place();
  assert.equal(await s.grantForOrder(o1), 0, "unpaid → no ticket");
  const paid = await c().orderRepository.markPaid(shop.id, o1.id);
  assert.equal(await s.grantForOrder(paid), 2);
  assert.equal(await s.grantForOrder(paid), 0, "idempotent");
  assert.equal(await s.ticketCount(shop.id, customer.id), 2);

  // Spin 1 → gift (stock 1) with a redeem code.
  const r1 = await s.spin(shop.id, customer.id);
  assert.equal(r1.result.prizeId, gift.id);
  assert.equal(r1.result.rewardStatus, "pending");
  assert.match(r1.result.rewardCode ?? "", /^[A-Z2-9]{8}$/);
  assert.equal((await c().luckyWheelRepository.findPrize(shop.id, gift.id))?.stock, 0);

  // Spin 2 → gift out of stock, so points (first eligible) → credited to ledger.
  const r2 = await s.spin(shop.id, customer.id);
  assert.equal(r2.result.prizeId, pts.id);
  assert.equal(r2.result.pointsAwarded, 10);
  assert.equal((await c().loyaltyPointsBalanceRepository.findByCustomer(shop.id, customer.id))?.currentPoints, 10);

  await assert.rejects(() => s.spin(shop.id, customer.id), /ยังไม่มีสิทธิ์/);

  // Another order: tickets granted, then cancelled → revoked.
  const o2 = await c().orderRepository.markPaid(shop.id, (await place()).id);
  assert.equal(await s.grantForOrder(o2), 2);
  assert.equal(await s.revokeForOrder(o2), 2);
  assert.equal(await s.ticketCount(shop.id, customer.id), 0);
});

test("below minimum order earns nothing", async () => {
  const { shop, item, customer, place } = await setup("lw-min");
  const s = svc();
  await withPrizes(s, shop.id, item.id);
  await s.updateCampaign(shop.id, { isActive: true, minOrderSatang: 50000 });
  const paid = await c().orderRepository.markPaid(shop.id, (await place()).id);
  assert.equal(await s.grantForOrder(paid), 0);
  assert.equal(await s.ticketCount(shop.id, customer.id), 0);
});

test("platform switch off blocks earning + spinning", async () => {
  const { shop, item, place } = await setup("lw-platform");
  const s = svc();
  await withPrizes(s, shop.id, item.id);
  await s.updateCampaign(shop.id, { isActive: true });
  await c().platformSettingsRepository.update({ luckyWheelEnabled: false });
  try {
    const paid = await c().orderRepository.markPaid(shop.id, (await place()).id);
    assert.equal(await s.grantForOrder(paid), 0);
  } finally {
    await c().platformSettingsRepository.update({ luckyWheelEnabled: true });
  }
});

test("staff redeem: once only, then rejected", async () => {
  const { shop, item, customer, place, } = await setup("lw-redeem");
  const s = svc({ rand: () => 0 });
  await withPrizes(s, shop.id, item.id);
  await s.updateCampaign(shop.id, { isActive: true });
  await s.grantForOrder(await c().orderRepository.markPaid(shop.id, (await place()).id));
  const { result } = await s.spin(shop.id, customer.id);
  const owner = (await c().userRepository.listByShop(shop.id))[0];
  const found = await s.findRewardByCode(shop.id, `https://x/redeem?code=${result.rewardCode!.toLowerCase()}`);
  assert.equal(found?.id, result.id);
  const done = await s.redeem(shop.id, result.id, owner, null);
  assert.equal(done.rewardStatus, "redeemed");
  await assert.rejects(() => s.redeem(shop.id, result.id, owner, null), /แลกไปแล้ว/);
});

test("daily cap excludes a prize after N wins today", async () => {
  const { shop, item, customer, place } = await setup("lw-cap");
  // rand picks the LAST eligible prize (free item, cap 1/day).
  const s = svc({ rand: (max) => max - 1 });
  const { free, pts } = await withPrizes(s, shop.id, item.id);
  await s.updateCampaign(shop.id, { isActive: true, ticketsPerOrder: 2 });
  await s.grantForOrder(await c().orderRepository.markPaid(shop.id, (await place()).id));
  assert.equal((await s.spin(shop.id, customer.id)).result.prizeId, free.id);
  assert.equal((await s.spin(shop.id, customer.id)).result.prizeId, pts.id);
});

test("monthly free spin: only inside the window, once per month", async () => {
  const { shop, item, customer } = await setup("lw-monthly");
  const inWindow = new Date("2026-11-29T05:00:00Z"); // 29 Nov Bangkok, last 3 days
  const outWindow = new Date("2026-11-10T05:00:00Z");
  const s0 = svc();
  await withPrizes(s0, shop.id, item.id);
  await s0.updateCampaign(shop.id, { isActive: true, monthlyFreeEnabled: true, monthlyWindowDays: 3 });
  assert.equal(await svc({ now: outWindow }).ensureMonthlyTicket(shop.id, customer.id), false);
  const s = svc({ now: inWindow });
  assert.equal(await s.ensureMonthlyTicket(shop.id, customer.id), true);
  assert.equal(await s.ensureMonthlyTicket(shop.id, customer.id), false);
  assert.equal(await s.ticketCount(shop.id, customer.id), 1);
});

test("kiosk receipt claim: paid anonymous kiosk order → member, only once", async () => {
  const { shop, item, customer, place } = await setup("lw-kiosk");
  const s = svc();
  await withPrizes(s, shop.id, item.id);
  await s.updateCampaign(shop.id, { isActive: true });
  const o = await place(null, "kiosk");
  await assert.rejects(() => s.claimKioskOrder(shop.id, o.id, customer.id), /ยืนยันการชำระเงิน/);
  await c().orderRepository.markPaid(shop.id, o.id);
  assert.equal(await s.claimKioskOrder(shop.id, o.id, customer.id), 1);
  await assert.rejects(() => s.claimKioskOrder(shop.id, o.id, customer.id), /ไปแล้ว/);
  const other = await c().customerRepository.findOrCreate(shop.id, "0899999999", "อีกคน");
  await assert.rejects(() => s.claimKioskOrder(shop.id, o.id, other.id), /ถูกใช้รับสิทธิ์ไปแล้ว/);
});
