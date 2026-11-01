import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import { SetShopBillingCutoffUseCase, SyncDailyFeesUseCase, MarkDailyFeePaidUseCase } from "./DailyFeeUseCases";

before(migrateTestDb);

/** Orders fake: counts timestamps in [from, to) — real repo for fees/terms. */
function harness(shopId: string, createdAt: string, orderTimes: string[]) {
  const orders = {
    countBillableBetween: async (_s: string, from: string, to: string) =>
      orderTimes.filter((t) => t >= from && t < to).length,
  } as unknown as IOrderRepository;
  const shops = {
    findById: async (id: string) => (id === shopId ? { id, createdAt } : null),
  } as unknown as IShopRepository;
  return new SyncDailyFeesUseCase(container.dailyFeeRepository, orders, shops);
}

async function platform(shopId: string, effectiveAt: string, threshold: number, feeSatang: number, cutoffTime = "04:00") {
  // Platform rows are global; tests use distinct far-apart years to stay isolated by time.
  await container.dailyFeeRepository.addTermsVersion({ shopId: null, effectiveAt, enabled: true, threshold, feeSatang, cutoffTime, createdBy: null });
}

test("sync materialises closed days once (idempotent) with snapshotted terms", async () => {
  const { shop } = await seedShop("dfee-idem");
  // Daily fees turned on 2030-01-01 03:00Z with threshold 2 / ฿5.
  await platform(shop.id, "2030-01-01T03:00:00Z", 2, 500);
  // Business day 2030-01-02 = [01T21:00Z, 02T21:00Z)
  const times = ["2030-01-01T22:00:00Z", "2030-01-02T01:00:00Z", "2030-01-02T20:59:59Z", "2030-01-02T21:00:00Z"];
  const uc = harness(shop.id, "2029-12-01T00:00:00Z", times);
  const now = new Date("2030-01-03T05:00:00Z");
  const a = await uc.execute(shop.id, now);
  const b = await uc.execute(shop.id, now);
  assert.equal(a.charges.length, b.charges.length);
  const d2 = b.charges.find((c) => c.businessDate === "2030-01-02")!;
  assert.equal(d2.orderCount, 3, "20:59:59Z is in, 21:00Z is the next day");
  assert.equal(d2.amountSatang, 500);
  assert.equal(d2.status, "due");
  assert.equal(b.outstandingSatang, 500);
  assert.equal(b.today.businessDate, "2030-01-03");
  assert.equal(b.today.orderCount, 1);
  assert.equal(b.today.projectedFeeSatang, 0);

  // Snapshot: a later change (threshold 0 / ฿9) never rewrites past rows, applies next day.
  await platform(shop.id, "2030-01-03T06:00:00Z", 0, 900);
  const c = await uc.execute(shop.id, new Date("2030-01-04T22:00:00Z"));
  const again = c.charges.find((x) => x.businessDate === "2030-01-02")!;
  assert.equal(again.amountSatang, 500);
  assert.equal(again.threshold, 2);
  const d3 = c.charges.find((x) => x.businessDate === "2030-01-03")!;
  assert.equal(d3.threshold, 2, "change mid-day 01-03 does not apply to 01-03");
  assert.equal(d3.amountSatang, 0);
  const d4 = c.charges.find((x) => x.businessDate === "2030-01-04")!;
  assert.equal(d4.threshold, 0);
  assert.equal(d4.feeSatang, 900);

  await new MarkDailyFeePaidUseCase(container.dailyFeeRepository).execute(shop.id, d2.id, "admin");
  assert.equal(await container.dailyFeeRepository.outstandingSatang(shop.id), 0);
  await assert.rejects(new MarkDailyFeePaidUseCase(container.dailyFeeRepository).execute(shop.id, d2.id, "admin"));
});

test("per-shop cutoff override is admin-set, validated and logged", async () => {
  const { shop } = await seedShop("dfee-cutoff");
  const uc = new SetShopBillingCutoffUseCase(container.dailyFeeRepository, container.shopRepository);
  await assert.rejects(uc.execute(shop.id, "25:00", "admin"));
  await uc.execute(shop.id, "23:30", "admin", new Date("2031-01-01T00:00:00Z"));
  assert.equal(await container.dailyFeeRepository.getShopCutoff(shop.id), "23:30");
  const v = await container.dailyFeeRepository.listTermsVersions(shop.id);
  assert.ok(v.some((x) => x.shopId === shop.id && x.cutoffTime === "23:30"));
  await uc.execute(shop.id, "", "admin");
  assert.equal(await container.dailyFeeRepository.getShopCutoff(shop.id), null);
});
