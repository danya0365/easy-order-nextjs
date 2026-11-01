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
  resolveRider,
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

test("availability toggle via link, lineId, open-job counts", async () => {
  const { SetRiderAvailabilityUseCase, ListRidersWithLoadUseCase } = await import("./RiderUseCases");
  const { shop } = await seedShop("rider-avail");
  const { shop: other } = await seedShop("rider-avail-other");
  const r1 = await new CreateRiderUseCase(riders()).execute(shop.id, {
    name: "หนึ่ง", phone: "0811112222", commissionType: "per_trip", commissionValue: 2000, lineId: " ~one.line ",
  });
  const r2 = await new CreateRiderUseCase(riders()).execute(shop.id, {
    name: "สอง", phone: "0811113333", commissionType: "per_trip", commissionValue: 2000,
  });
  assert.equal(r1.lineId, "one.line");
  assert.equal(r2.lineId, null);
  assert.equal(r1.available, true);
  await assert.rejects(async () =>
    new CreateRiderUseCase(riders()).execute(shop.id, {
      name: "x", phone: "0811112222", commissionType: "per_trip", commissionValue: 0, lineId: "bad id!",
    }),
    /LINE/,
  );

  const token = await new RegenerateRiderLinkUseCase(riders()).execute(shop.id, r1.id);
  const off = await new SetRiderAvailabilityUseCase(riders()).execute(token, false);
  assert.equal(off.available, false);
  assert.ok(off.availableUpdatedAt);
  await assert.rejects(async () => new SetRiderAvailabilityUseCase(riders()).execute("y".repeat(43), true), /ลิงก์/);

  // busy rider is still assignable
  const assign = new AssignRiderUseCase(orders(), riders());
  const o1 = await deliveryOrder(shop.id);
  const o2 = await deliveryOrder(shop.id);
  const o3 = await deliveryOrder(shop.id);
  await assign.execute(shop.id, o1.id, r1.id);
  await assign.execute(shop.id, o2.id, r1.id);
  await assign.execute(shop.id, o3.id, r2.id);
  await new RiderUpdateJobUseCase(riders(), orders()).execute(token, o1.id, "picked_up");
  const t2 = await new RegenerateRiderLinkUseCase(riders()).execute(shop.id, r2.id);
  const upd = new RiderUpdateJobUseCase(riders(), orders());
  await upd.execute(t2, o3.id, "picked_up");
  await upd.execute(t2, o3.id, "delivered");
  // other shop's orders never count
  const ro = await new CreateRiderUseCase(riders()).execute(other.id, {
    name: "o", phone: "0811114444", commissionType: "full_fee", commissionValue: 0,
  });
  await assign.execute(other.id, (await deliveryOrder(other.id)).id, ro.id);

  const list = await new ListRidersWithLoadUseCase(riders(), orders()).execute(shop.id);
  const byName = Object.fromEntries(list.map((r) => [r.name, r]));
  assert.equal(list.length, 2);
  assert.equal(byName["หนึ่ง"].openJobs, 2);
  assert.equal(byName["หนึ่ง"].available, false);
  assert.equal(byName["สอง"].openJobs, 0, "delivered jobs are not open");
});

test("cookie session: /r/[token] sets cookie; regenerate kills old cookie; cookie routes", async () => {
  const { GET: login } = await import("@/app/(rider)/r/[token]/route");
  const { POST: jobPost } = await import("@/app/(rider)/rider/job/route");
  const { POST: availPost } = await import("@/app/(rider)/rider/availability/route");
  const { shop } = await seedShop("rider-cookie");
  const r = await new CreateRiderUseCase(riders()).execute(shop.id, {
    name: "คุกกี้", phone: "0812345678", commissionType: "per_trip", commissionValue: 1000,
  });
  const token = await new RegenerateRiderLinkUseCase(riders()).execute(shop.id, r.id);
  const ctx = (t: string) => ({ params: Promise.resolve({ token: t }) });

  const ok = await login(new Request(`https://x.test/r/${token}`), ctx(token));
  assert.equal(ok.status, 303);
  assert.equal(ok.headers.get("location"), "/rider");
  const sc = ok.headers.get("set-cookie") ?? "";
  assert.match(sc, /^eo_rider=/);
  assert.match(sc, /HttpOnly/);
  assert.match(sc, /Secure/);
  assert.equal(ok.headers.get("referrer-policy"), "no-referrer");
  assert.equal(ok.headers.get("cache-control"), "no-store");
  const cookie = sc.split(";")[0];

  const bad = await login(new Request("https://x.test/r/bad"), ctx("A".repeat(43)));
  assert.match(bad.headers.get("set-cookie") ?? "", /Max-Age=0/, "invalid link clears cookie");

  const form = (o: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) f.set(k, v);
    return f;
  };
  // cookie works for job + availability
  const order = await deliveryOrder(shop.id);
  await new AssignRiderUseCase(orders(), riders()).execute(shop.id, order.id, r.id);
  const req = (path: string, body: FormData, c = cookie) =>
    new Request(`https://x.test${path}`, { method: "POST", body, headers: { cookie: c } });
  const j1 = await jobPost(req("/rider/job", form({ orderId: order.id, do: "picked_up" })));
  assert.equal(j1.headers.get("location"), "/rider");
  assert.equal((await orders().findById(shop.id, order.id))?.deliveryStatus, "picked_up");
  const a1 = await availPost(req("/rider/availability", form({ available: "0" })));
  assert.equal(a1.headers.get("location"), "/rider");
  assert.equal((await riders().findById(shop.id, r.id))?.available, false);

  // no cookie → rejected
  const nc = await jobPost(req("/rider/job", form({ orderId: order.id, do: "delivered" }), ""));
  assert.equal(nc.headers.get("location"), "/rider?e=failed");

  // shop regenerates the link → old cookie dead
  await new RegenerateRiderLinkUseCase(riders()).execute(shop.id, r.id);
  const dead = await jobPost(req("/rider/job", form({ orderId: order.id, do: "delivered" })));
  assert.equal(dead.headers.get("location"), "/rider?e=failed");
  assert.equal((await orders().findById(shop.id, order.id))?.deliveryStatus, "picked_up");
  assert.equal(await resolveRider(riders(), token), null);
});

test("rider cookie cannot touch another shop's order (tenant isolation)", async () => {
  const { POST: jobPost } = await import("@/app/(rider)/rider/job/route");
  const { shop: a } = await seedShop("rider-tenant-alpha");
  const { shop: b } = await seedShop("rider-tenant-bravo");
  const ra = await new CreateRiderUseCase(riders()).execute(a.id, {
    name: "เอ", phone: "0811111111", commissionType: "per_trip", commissionValue: 0,
  });
  const rb = await new CreateRiderUseCase(riders()).execute(b.id, {
    name: "บี", phone: "0822222222", commissionType: "per_trip", commissionValue: 0,
  });
  const tokenA = await new RegenerateRiderLinkUseCase(riders()).execute(a.id, ra.id);
  const ob = await deliveryOrder(b.id);
  await new AssignRiderUseCase(orders(), riders()).execute(b.id, ob.id, rb.id);
  const f = new FormData();
  f.set("orderId", ob.id);
  f.set("do", "picked_up");
  const res = await jobPost(
    new Request("https://x.test/rider/job", { method: "POST", body: f, headers: { cookie: `eo_rider=${tokenA}` } }),
  );
  assert.equal(res.headers.get("location"), "/rider?e=failed");
  assert.equal((await orders().findById(b.id, ob.id))?.deliveryStatus, "assigned");
});

test("rider earnings + avatar upload", async () => {
  const { GetRiderEarningsUseCase, SaveRiderAvatarUseCase, startOfBangkokWeekISO } = await import("./RiderUseCases");
  // Monday 00:00 BKK: Wed 2026-11-04 10:00 BKK → Mon 2026-11-02 00:00 BKK = 2026-11-01T17:00Z
  assert.equal(startOfBangkokWeekISO(new Date("2026-11-04T03:00:00Z")), "2026-11-01T17:00:00.000Z");
  // Sunday late evening BKK still belongs to the week starting the previous Monday
  assert.equal(startOfBangkokWeekISO(new Date("2026-11-01T16:00:00Z")), "2026-10-25T17:00:00.000Z");

  const { shop } = await seedShop("rider-earn");
  const r = await new CreateRiderUseCase(riders()).execute(shop.id, {
    name: "รายได้", phone: "0833333333", commissionType: "per_trip", commissionValue: 3000,
  });
  const token = await new RegenerateRiderLinkUseCase(riders()).execute(shop.id, r.id);
  const o = await deliveryOrder(shop.id);
  await new AssignRiderUseCase(orders(), riders()).execute(shop.id, o.id, r.id);
  const upd = new RiderUpdateJobUseCase(riders(), orders());
  await upd.execute(token, o.id, "picked_up");
  await upd.execute(token, o.id, "cod");
  await upd.execute(token, o.id, "delivered");
  const e = await new GetRiderEarningsUseCase(riders(), orders()).execute(token);
  assert.ok(e);
  assert.equal(e.today.trips, 1);
  assert.equal(e.week.trips, 1);
  assert.equal(e.today.commissionSatang, 3000);
  assert.equal(e.today.codCollectedSatang, o.totalSatang);
  assert.equal(e.history.length, 1);
  assert.equal(await new GetRiderEarningsUseCase(riders(), orders()).execute("z".repeat(43)), null);

  const saved = new Map<string, Uint8Array>();
  const deleted: string[] = [];
  const storage = {
    async saveObject(i: { key: string; bytes: Uint8Array }) { saved.set(i.key, i.bytes); return { url: i.key }; },
    async delete(k: string) { deleted.push(k); },
  } as unknown as import("@/src/application/services/ISlipStorage").ISlipStorage;
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const uc = new SaveRiderAvatarUseCase(riders(), storage);
  const first = await uc.execute(token, "image/jpeg", jpeg);
  assert.match(first.avatarUrl ?? "", new RegExp(`^riders/${shop.id}/${r.id}/.+\\.jpg$`));
  const second = await uc.execute(token, "image/jpeg", jpeg);
  assert.deepEqual(deleted, [first.avatarUrl], "old avatar removed on replace");
  assert.equal(await riders().findAvatarKey(r.id), second.avatarUrl);
  await assert.rejects(async () => uc.execute(token, "image/png", jpeg));
  await assert.rejects(async () => uc.execute("q".repeat(43), "image/jpeg", jpeg), /ลิงก์/);
});
