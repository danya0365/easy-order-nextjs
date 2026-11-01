import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import {
  AssignRiderUseCase,
  CreateRiderUseCase,
  GetRiderDashboardUseCase,
  RegenerateRiderLinkUseCase,
  RevokeRiderLinkUseCase,
  RiderPayoutSummaryUseCase,
  RiderUpdateJobUseCase,
  UpdateRiderUseCase,
} from "./RiderUseCases";

before(async () => {
  await migrateTestDb();
});

const riders = () => container.riderRepository;
const orders = () => container.orderRepository;

async function deliveryOrder(shopId: string, fulfillmentType: "delivery" | "pickup" = "delivery") {
  return orders().create({
    shopId,
    paymentMethod: "cash",
    channel: "online",
    fulfillmentType,
    deliveryAddress: fulfillmentType === "delivery" ? "99 ถนนสุขุมวิท" : null,
    deliveryFeeSatang: fulfillmentType === "delivery" ? 4000 : 0,
    customerName: "ลูกค้า",
    customerPhone: "0812345678",
    items: [{ menuItemId: null, nameSnapshot: "ข้าวผัด", unitPriceSatang: 6000, quantity: 1 }],
  });
}

test("full rider flow: create → link → assign → pick up → deliver → COD → payout", async () => {
  const { shop } = await seedShop("rider-flow");
  const rider = await new CreateRiderUseCase(riders()).execute(shop.id, {
    name: "สมชาย ใจดี",
    phone: "081-111-2222",
    commissionType: "percent_fee",
    commissionValue: 50,
  });
  assert.equal(rider.phone, "0811112222");
  assert.equal(rider.hasLink, false);

  const token = await new RegenerateRiderLinkUseCase(riders()).execute(shop.id, rider.id);
  const order = await deliveryOrder(shop.id);
  const assigned = await new AssignRiderUseCase(orders(), riders()).execute(shop.id, order.id, rider.id);
  assert.equal(assigned.deliveryStatus, "assigned");
  assert.equal(assigned.riderCommissionSatang, 2000, "50% of 40 THB fee");

  const dash = new GetRiderDashboardUseCase(riders(), orders());
  const d1 = await dash.execute(token);
  assert.equal(d1?.jobs.length, 1);

  const upd = new RiderUpdateJobUseCase(riders(), orders());
  await assert.rejects(upd.execute(token, order.id, "delivered"), "cannot skip pick-up");
  await upd.execute(token, order.id, "picked_up");
  await assert.rejects(
    new AssignRiderUseCase(orders(), riders()).execute(shop.id, order.id, rider.id),
    "no reassign after pick-up",
  );
  await upd.execute(token, order.id, "delivered");
  const done = await upd.execute(token, order.id, "cod");
  assert.equal(done.codCollected, true);
  assert.ok(done.deliveredAt);

  const d2 = await dash.execute(token);
  assert.equal(d2?.jobs.length, 0);
  assert.equal(d2?.today.trips, 1);
  assert.equal(d2?.today.commissionSatang, 2000);
  assert.equal(d2?.today.codCollectedSatang, 10000);

  const from = new Date(Date.now() - 86400_000).toISOString();
  const to = new Date(Date.now() + 86400_000).toISOString();
  const rows = await new RiderPayoutSummaryUseCase(riders()).execute(shop.id, from, to);
  assert.deepEqual(rows.map((r) => [r.trips, r.commissionSatang, r.codCollectedSatang]), [[1, 2000, 10000]]);
});

test("regenerate revokes old link; deactivated rider link is dead", async () => {
  const { shop } = await seedShop("rider-revoke");
  const rider = await new CreateRiderUseCase(riders()).execute(shop.id, {
    name: "A", phone: "0811112222", commissionType: "per_trip", commissionValue: 3000,
  });
  const regen = new RegenerateRiderLinkUseCase(riders());
  const t1 = await regen.execute(shop.id, rider.id);
  const t2 = await regen.execute(shop.id, rider.id);
  const dash = new GetRiderDashboardUseCase(riders(), orders());
  assert.equal(await dash.execute(t1), null);
  assert.ok(await dash.execute(t2));
  await new UpdateRiderUseCase(riders()).execute(shop.id, rider.id, {
    name: "A", phone: "0811112222", commissionType: "per_trip", commissionValue: 3000, active: false,
  });
  assert.equal(await dash.execute(t2), null);
  await new RevokeRiderLinkUseCase(riders()).execute(shop.id, rider.id);
  assert.equal((await riders().findById(shop.id, rider.id))?.hasLink, false);
});

test("tenant isolation: cannot assign other shop's rider; rider sees only own jobs", async () => {
  const { shop: a } = await seedShop("rider-iso-a");
  const { shop: b } = await seedShop("rider-iso-b");
  const mk = (shopId: string) =>
    new CreateRiderUseCase(riders()).execute(shopId, {
      name: "R", phone: "0811112222", commissionType: "full_fee", commissionValue: 0,
    });
  const ra = await mk(a.id);
  const rb = await mk(b.id);
  const ra2 = await mk(a.id);
  const oa = await deliveryOrder(a.id);
  const assign = new AssignRiderUseCase(orders(), riders());
  await assert.rejects(assign.execute(a.id, oa.id, rb.id), /ไม่พบไรเดอร์/);
  await assert.rejects(assign.execute(b.id, oa.id, rb.id), /ไม่พบออเดอร์/);
  const pickup = await deliveryOrder(a.id, "pickup");
  await assert.rejects(assign.execute(a.id, pickup.id, ra.id), /เดลิเวอรี่/);

  await assign.execute(a.id, oa.id, ra.id);
  const tb = await new RegenerateRiderLinkUseCase(riders()).execute(b.id, rb.id);
  const ta2 = await new RegenerateRiderLinkUseCase(riders()).execute(a.id, ra2.id);
  const upd = new RiderUpdateJobUseCase(riders(), orders());
  await assert.rejects(upd.execute(tb, oa.id, "picked_up"), /ไม่พบงาน/);
  await assert.rejects(upd.execute(ta2, oa.id, "picked_up"), /ไม่พบงาน/, "same shop, other rider");
  assert.equal((await new GetRiderDashboardUseCase(riders(), orders()).execute(ta2))?.jobs.length, 0);
  await assert.rejects(upd.execute("x".repeat(43), oa.id, "picked_up"), /ลิงก์/);

  // reassign before pickup is allowed
  const re = await assign.execute(a.id, oa.id, ra2.id);
  assert.equal(re.riderId, ra2.id);
});
