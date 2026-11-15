import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import {
  AssignRiderUseCase,
  CreateRiderUseCase,
  DuplicateRiderPhoneError,
  GetRiderDashboardUseCase,
  GetRiderEarningsUseCase,
  GetShopRiderDetailUseCase,
  ListRidersPageUseCase,
  RegenerateRiderLinkUseCase,
  RevokeRiderLinkUseCase,
  RevokeRiderMembershipUseCase,
  RiderPayoutSummaryUseCase,
  RiderUpdateJobUseCase,
  SaveRiderAvatarUseCase,
  SetRiderAvailabilityUseCase,
  UpdateRiderUseCase,
  normalizeRiderPhone,
  resolveRider,
  startOfBangkokWeekISO,
  type RiderSession,
} from "./RiderUseCases";
import { sessionFromCookieValue } from "@/src/infrastructure/auth/rider-session";

process.env.ORDER_ACCESS_SECRET ||= "test-secret-for-rider-sessions";

before(async () => {
  await migrateTestDb();
});

const riders = () => container.riderRepository;
const orders = () => container.orderRepository;

async function deliveryOrder(
  shopId: string,
  opts: { fulfillmentType?: "delivery" | "pickup"; accept?: boolean; paymentMethod?: "cash" | "promptpay_qr" } = {},
) {
  const fulfillmentType = opts.fulfillmentType ?? "delivery";
  const o = await orders().create({
    shopId,
    paymentMethod: opts.paymentMethod ?? "cash",
    channel: "online",
    fulfillmentType,
    deliveryAddress: fulfillmentType === "delivery" ? "99 ถนนสุขุมวิท" : null,
    deliveryFeeSatang: fulfillmentType === "delivery" ? 4000 : 0,
    customerName: "ลูกค้า",
    customerPhone: "0812345678",
    items: [{ menuItemId: null, nameSnapshot: "ข้าวผัด", unitPriceSatang: 6000, quantity: 1 }],
  });
  return opts.accept === false ? o : orders().setStatus(shopId, o.id, "preparing");
}

const ctx = (t: string) => ({ params: Promise.resolve({ token: t }) });
const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const cookieOf = (res: Response, name: string) =>
  (res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""])
    .map((c) => c.split(";")[0])
    .find((c) => c.startsWith(`${name}=`) && c.length > name.length + 1) ?? null;

/** Open a shop link (optionally on a device that already has a session cookie). */
async function openLink(token: string, cookie?: string | null) {
  const { GET } = await import("@/app/(rider)/r/[token]/route");
  const res = await GET(new Request(`https://x.test/r/${token}`, { headers: cookie ? { cookie } : {} }), ctx(token));
  return { res, location: res.headers.get("location"), session: cookieOf(res, "eo_rider"), invite: cookieOf(res, "eo_rider_invite") };
}

/** Confirm-page POST. */
async function decide(choice: string, invite: string, session?: string | null) {
  const { POST } = await import("@/app/(rider)/rider-join/decide/route");
  const cookie = [invite, session].filter(Boolean).join("; ");
  const res = await POST(new Request("https://x.test/rider-join/decide", { method: "POST", body: form({ choice }), headers: { cookie } }));
  return { location: res.headers.get("location"), session: cookieOf(res, "eo_rider") };
}

async function session(cookie: string | null): Promise<RiderSession> {
  const s = await sessionFromCookieValue(cookie ? cookie.slice("eo_rider=".length) : null);
  assert.ok(s, "session resolves");
  return s;
}

/** New rider (invited) → link → accept → signed session cookie. */
async function onboard(shopId: string, name: string, phone: string, extra: Partial<{ commissionType: "per_trip" | "percent_fee" | "full_fee"; commissionValue: number }> = {}) {
  const r = await new CreateRiderUseCase(riders()).execute(shopId, {
    name, phone, commissionType: extra.commissionType ?? "per_trip", commissionValue: extra.commissionValue ?? 2000,
  });
  assert.equal(r.status, "invited");
  const token = await new RegenerateRiderLinkUseCase(riders()).execute(shopId, r.id);
  const o = await openLink(token);
  assert.equal(o.location, "/rider-join", "invited → confirm page");
  assert.ok(o.invite);
  const d = await decide("accept", o.invite!);
  assert.equal(d.location, "/rider?joined=1");
  return { rider: r, token, cookie: d.session! };
}

test("phone normalisation", () => {
  assert.equal(normalizeRiderPhone("081-111-2222"), "0811112222");
  assert.equal(normalizeRiderPhone("+66 81 111 2222"), "0811112222");
});

test("full flow: invite → accept → assign → bug1 (shop must accept) → bug2 (COD first) → payout", async () => {
  const { shop } = await seedShop("rider-flow");
  const { rider, cookie } = await onboard(shop.id, "สมชาย ใจดี", "081-111-2222", { commissionType: "percent_fee", commissionValue: 50 });
  const s = await session(cookie);
  assert.equal(s.memberships.length, 1);
  assert.equal(s.full, true);

  // Bug 1: an order the shop has not accepted cannot be picked up.
  const pending = await deliveryOrder(shop.id, { accept: false });
  await new AssignRiderUseCase(orders(), riders()).execute(shop.id, pending.id, rider.id);
  const upd = new RiderUpdateJobUseCase(orders());
  await assert.rejects(upd.execute(s, shop.id, pending.id, "picked_up"), /ร้านยังไม่ได้รับออเดอร์/);
  const dash0 = await new GetRiderDashboardUseCase(orders()).execute(s);
  assert.match(dash0.jobs[0].blockedReason ?? "", /ร้านยังไม่ได้รับ/);

  const order = await deliveryOrder(shop.id);
  const assigned = await new AssignRiderUseCase(orders(), riders()).execute(shop.id, order.id, rider.id);
  assert.equal(assigned.riderCommissionSatang, 2000, "50% of 40 THB fee");
  await assert.rejects(upd.execute(s, shop.id, order.id, "delivered"), "cannot skip pick-up");
  await upd.execute(s, shop.id, order.id, "picked_up");
  await assert.rejects(new AssignRiderUseCase(orders(), riders()).execute(shop.id, order.id, rider.id), "no reassign after pick-up");

  // Bug 2: a COD order cannot be delivered before cash is collected.
  await assert.rejects(upd.execute(s, shop.id, order.id, "delivered"), /ต้องเก็บเงินสด/);
  const done = await upd.execute(s, shop.id, order.id, "cod_delivered");
  assert.equal(done.codCollected, true);
  assert.equal(done.deliveryStatus, "delivered");
  assert.equal(done.paymentStatus, "paid");
  assert.equal(done.status, "completed");

  const d2 = await new GetRiderDashboardUseCase(orders()).execute(s);
  assert.equal(d2.jobs.length, 1, "only the not-yet-accepted job is left");
  assert.equal(d2.today.trips, 1);
  assert.equal(d2.today.codCollectedSatang, 10000);

  const from = new Date(Date.now() - 86400_000).toISOString();
  const to = new Date(Date.now() + 86400_000).toISOString();
  const rows = await new RiderPayoutSummaryUseCase(riders()).execute(shop.id, from, to);
  assert.deepEqual(rows.map((r) => [r.trips, r.commissionSatang, r.codCollectedSatang]), [[1, 2000, 10000]]);
});

test("transfer order (paid) delivers without COD; legacy unpaid cash delivery still counts as cash to return", async () => {
  const { shop } = await seedShop("rider-cash");
  const { rider, cookie } = await onboard(shop.id, "เงินสด", "0811119999");
  const s = await session(cookie);
  const paid = await deliveryOrder(shop.id, { paymentMethod: "promptpay_qr" });
  await orders().markPaid(shop.id, paid.id);
  await new AssignRiderUseCase(orders(), riders()).execute(shop.id, paid.id, rider.id);
  const upd = new RiderUpdateJobUseCase(orders());
  await upd.execute(s, shop.id, paid.id, "picked_up");
  const d = await upd.execute(s, shop.id, paid.id, "delivered");
  assert.equal(d.status, "completed");
  // Legacy row: cash delivered without COD flag (before the rule) → still cash due.
  const legacy = await deliveryOrder(shop.id);
  await new AssignRiderUseCase(orders(), riders()).execute(shop.id, legacy.id, rider.id);
  await orders().setDeliveryStatus(shop.id, legacy.id, "picked_up");
  await orders().setDeliveryStatus(shop.id, legacy.id, "delivered");
  const from = new Date(Date.now() - 86400_000).toISOString();
  const to = new Date(Date.now() + 86400_000).toISOString();
  const [row] = await new RiderPayoutSummaryUseCase(riders()).execute(shop.id, from, to);
  assert.equal(row.trips, 2);
  assert.equal(row.codCollectedSatang, legacy.totalSatang, "unpaid cash delivery counted, paid transfer not");
});

test("one rider, many shops: invitation by phone, attach on own device, jobs + earnings across shops", async () => {
  const { shop: a } = await seedShop("multi-a");
  const { shop: b } = await seedShop("multi-b");
  const { rider: ra, cookie: c1 } = await onboard(a.id, "ไรเดอร์หลายร้าน", "0899990011");

  // Shop B adds the same phone → membership on the SAME account, still invited.
  const rb = await new CreateRiderUseCase(riders()).execute(b.id, {
    name: "ชื่อที่ร้าน B ตั้ง", phone: "089-999-0011", commissionType: "per_trip", commissionValue: 1500,
  });
  assert.equal(rb.accountId, ra.accountId);
  assert.equal(rb.status, "invited");
  // Not assignable until the rider accepts.
  const ob = await deliveryOrder(b.id);
  await assert.rejects(new AssignRiderUseCase(orders(), riders()).execute(b.id, ob.id, rb.id), /ยังไม่ได้ยืนยัน/);

  const tb = await new RegenerateRiderLinkUseCase(riders()).execute(b.id, rb.id);
  // Someone WITHOUT the rider's session (e.g. shop B's owner) cannot accept into the existing account.
  const stranger = await openLink(tb);
  assert.equal(stranger.location, "/rider-join");
  const bad = await decide("accept", stranger.invite!);
  assert.match(decodeURIComponent(bad.location ?? ""), /ทำรายการนี้ไม่ได้/);

  // The rider opens shop B's link on their own device → confirm → same account, both shops.
  const own = await openLink(tb, c1);
  assert.equal(own.location, "/rider-join");
  const ok = await decide("accept", own.invite!, c1);
  assert.equal(ok.location, "/rider?joined=1");
  const s = await session(ok.session);
  assert.deepEqual(s.memberships.map((m) => m.shopId).sort(), [a.id, b.id].sort());
  assert.equal(s.full, true);

  const oa = await deliveryOrder(a.id);
  await new AssignRiderUseCase(orders(), riders()).execute(a.id, oa.id, ra.id);
  await new AssignRiderUseCase(orders(), riders()).execute(b.id, ob.id, rb.id);
  const dash = await new GetRiderDashboardUseCase(orders()).execute(s);
  assert.equal(dash.jobs.length, 2);
  assert.deepEqual(new Set(dash.jobs.map((j) => j.shopName)), new Set([a.name, b.name]));
  assert.equal((await new GetRiderDashboardUseCase(orders()).execute(s, b.id)).jobs.length, 1, "shop filter");

  const upd = new RiderUpdateJobUseCase(orders());
  // shopId in the form must match the order's shop membership
  await assert.rejects(upd.execute(s, a.id, ob.id, "picked_up"), /ไม่พบงาน/);
  for (const [shopId, id] of [[a.id, oa.id], [b.id, ob.id]] as const) {
    await upd.execute(s, shopId, id, "picked_up");
    await upd.execute(s, shopId, id, "cod_delivered");
  }
  const e = await new GetRiderEarningsUseCase(orders()).execute(s);
  assert.equal(e.today.trips, 2);
  assert.equal(e.today.commissionSatang, 2000 + 1500);
  const byShop = Object.fromEntries(e.perShop.map((p) => [p.shopId, p.today]));
  assert.equal(byShop[a.id].commissionSatang, 2000);
  assert.equal(byShop[b.id].commissionSatang, 1500);
  assert.equal(byShop[a.id].codCollectedSatang, oa.totalSatang);
  assert.equal(byShop[b.id].codCollectedSatang, ob.totalSatang);

  // Privacy: shop A's payout + detail only know shop A.
  const from = new Date(Date.now() - 86400_000).toISOString();
  const to = new Date(Date.now() + 86400_000).toISOString();
  const pa = await new RiderPayoutSummaryUseCase(riders()).execute(a.id, from, to);
  assert.deepEqual(pa.map((r) => [r.riderId, r.trips]), [[ra.id, 1]]);
  const detail = await new GetShopRiderDetailUseCase(riders(), orders()).execute(a.id, ra.id);
  assert.equal(detail?.recent.length, 1);
  assert.equal(await new GetShopRiderDetailUseCase(riders(), orders()).execute(a.id, rb.id), null);

  // A device that only holds shop A's link sees only shop A.
  const ta = await new RegenerateRiderLinkUseCase(riders()).execute(a.id, ra.id);
  const onlyA = await openLink(ta);
  assert.equal(onlyA.location, "/rider");
  const sa = await session(onlyA.session);
  assert.deepEqual(sa.memberships.map((m) => m.shopId), [a.id]);
  assert.equal(sa.full, false);
  await assert.rejects(
    new SaveRiderAvatarUseCase(riders(), {} as never).execute(sa, "image/jpeg", new Uint8Array([0xff, 0xd8, 0xff])),
    /ทุกร้าน/,
  );

  // Shop B revokes ITS membership only.
  await new RevokeRiderMembershipUseCase(riders()).execute(b.id, rb.id);
  const after = await session(ok.session);
  assert.deepEqual(after.memberships.map((m) => m.shopId), [a.id]);
});

test("legacy separate accounts (same phone, backfilled) merge only when the rider confirms", async () => {
  const { shop: a } = await seedShop("legacy-a");
  const { shop: b } = await seedShop("legacy-b");
  // Simulate two backfilled rows: separate accounts, no phone key, approved.
  const mk = async (shopId: string) => {
    const acct = await riders().createAccount({ name: "เก่า", phone: "0899990001", phoneKey: null });
    return riders().create(shopId, {
      name: "เก่า", phone: "0899990001", commissionType: "per_trip", commissionValue: 1000, accountId: acct.id, status: "approved",
    });
  };
  const ra = await mk(a.id);
  const rb = await mk(b.id);
  const ta = await new RegenerateRiderLinkUseCase(riders()).execute(a.id, ra.id);
  const tb = await new RegenerateRiderLinkUseCase(riders()).execute(b.id, rb.id);
  const la = await openLink(ta);
  assert.equal(la.location, "/rider", "approved legacy link logs straight in");
  const lb = await openLink(tb, la.session);
  assert.equal(lb.location, "/rider-join", "different account → ask");
  const merged = await decide("attach", lb.invite!, la.session);
  const s = await session(merged.session);
  assert.equal(s.memberships.length, 2);
  const moved = await riders().findById(b.id, rb.id);
  assert.equal(moved?.accountId, ra.accountId);
  const old = await riders().findAccountById(rb.accountId);
  assert.equal(old?.mergedIntoId, ra.accountId, "emptied account marked merged, not deleted");
});

test("duplicate phone in same shop warns; pagination; regenerate/revoke link; legacy cookie", async () => {
  const { shop } = await seedShop("rider-dup");
  const create = new CreateRiderUseCase(riders());
  const base = { commissionType: "per_trip" as const, commissionValue: 0 };
  await create.execute(shop.id, { name: "หนึ่ง", phone: "0811112222", ...base });
  await assert.rejects(create.execute(shop.id, { name: "ซ้ำ", phone: "081-111-2222", ...base }), /อยู่แล้ว/);
  // Same phone in this shop under a legacy (unclaimed) account → soft warning, can confirm.
  const legacyAcct = await riders().createAccount({ name: "L", phone: "0822223333", phoneKey: null });
  await riders().create(shop.id, { name: "L", phone: "0822223333", ...base, accountId: legacyAcct.id, status: "approved" });
  await assert.rejects(create.execute(shop.id, { name: "L2", phone: "0822223333", ...base }), DuplicateRiderPhoneError);
  const forced = await create.execute(shop.id, { name: "L2", phone: "0822223333", ...base }, { allowDuplicatePhone: true });
  assert.equal(forced.status, "invited");

  for (let i = 0; i < 9; i++) await create.execute(shop.id, { name: `p${i}`, phone: `08300000${10 + i}`, ...base });
  const p1 = await new ListRidersPageUseCase(riders(), orders()).execute(shop.id, 1, 10);
  const p2 = await new ListRidersPageUseCase(riders(), orders()).execute(shop.id, 2, 10);
  assert.equal(p1.total, 12);
  assert.equal(p1.pageCount, 2);
  assert.equal(p1.items.length, 10);
  assert.equal(p2.items.length, 2);
  assert.equal((await new ListRidersPageUseCase(riders(), orders()).execute(shop.id, 99, 10)).page, 2);

  // Legacy cookie (raw link token) still works; regenerate kills it.
  const r = p1.items[1];
  const t1 = await new RegenerateRiderLinkUseCase(riders()).execute(shop.id, r.id);
  assert.ok(await sessionFromCookieValue(t1));
  await new RegenerateRiderLinkUseCase(riders()).execute(shop.id, r.id);
  assert.equal(await sessionFromCookieValue(t1), null);
  await new RevokeRiderLinkUseCase(riders()).execute(shop.id, r.id);
  assert.equal((await riders().findById(shop.id, r.id))?.hasLink, false);
  assert.equal(await resolveRider(riders(), t1), null);
});

test("cookie routes: job + availability (global vs per-shop) + tenant isolation", async () => {
  const { POST: jobPost } = await import("@/app/(rider)/rider/job/route");
  const { POST: availPost } = await import("@/app/(rider)/rider/availability/route");
  const { shop: a } = await seedShop("rider-routes-a");
  const { shop: b } = await seedShop("rider-routes-b");
  const { rider, cookie } = await onboard(a.id, "คุกกี้", "0812345678", { commissionValue: 1000 });
  const { rider: other } = await onboard(b.id, "บี", "0822222222");
  const req = (path: string, body: FormData, c: string = cookie) =>
    new Request(`https://x.test${path}`, { method: "POST", body, headers: { cookie: c } });

  const order = await deliveryOrder(a.id);
  await new AssignRiderUseCase(orders(), riders()).execute(a.id, order.id, rider.id);
  const j1 = await jobPost(req("/rider/job", form({ orderId: order.id, shopId: a.id, do: "picked_up" })));
  assert.equal(j1.headers.get("location"), "/rider");
  const j2 = await jobPost(req("/rider/job", form({ orderId: order.id, shopId: a.id, do: "delivered" })));
  assert.match(decodeURIComponent(j2.headers.get("location") ?? ""), /e=failed&msg=ต้องเก็บเงินสด/);

  const ob = await deliveryOrder(b.id);
  await new AssignRiderUseCase(orders(), riders()).execute(b.id, ob.id, other.id);
  const cross = await jobPost(req("/rider/job", form({ orderId: ob.id, shopId: b.id, do: "picked_up" })));
  assert.match(cross.headers.get("location") ?? "", /e=failed/);
  assert.equal((await orders().findById(b.id, ob.id))?.deliveryStatus, "assigned");
  const nc = await jobPost(req("/rider/job", form({ orderId: order.id, shopId: a.id, do: "cod_delivered" }), ""));
  assert.match(nc.headers.get("location") ?? "", /e=failed/);

  const a1 = await availPost(req("/rider/availability", form({ available: "0" })));
  assert.equal(a1.headers.get("location"), "/rider");
  assert.equal((await riders().findById(a.id, rider.id))?.available, false);
  assert.equal((await riders().findAccountById(rider.accountId))?.available, false);
  await container.platformSettingsRepository.update({ riderAvailabilityMode: "per_shop" });
  await availPost(req("/rider/availability", form({ available: "1", shopId: a.id })));
  assert.equal((await riders().findById(a.id, rider.id))?.available, true);
  await container.platformSettingsRepository.update({ riderAvailabilityMode: "global" });
  const s = await session(cookie);
  await new SetRiderAvailabilityUseCase(riders()).execute(s, false, "global");
  assert.equal((await riders().findById(a.id, rider.id))?.available, false);

  // Shop edits its own label only.
  await new UpdateRiderUseCase(riders()).execute(a.id, rider.id, {
    name: "ชื่อใหม่", phone: "0812345678", commissionType: "per_trip", commissionValue: 1000, active: true,
  });
  assert.equal((await session(cookie)).account.name, "คุกกี้", "account name is the rider's own");
});

test("week start + avatar upload (account-wide, legacy keys kept)", async () => {
  assert.equal(startOfBangkokWeekISO(new Date("2026-11-04T03:00:00Z")), "2026-11-01T17:00:00.000Z");
  assert.equal(startOfBangkokWeekISO(new Date("2026-11-01T16:00:00Z")), "2026-10-25T17:00:00.000Z");
  const { shop } = await seedShop("rider-avatar");
  const { rider, cookie } = await onboard(shop.id, "รูป", "0833333333");
  const s = await session(cookie);
  const deleted: string[] = [];
  const storage = {
    async saveObject() { return { url: "" }; },
    async delete(k: string) { deleted.push(k); },
  } as unknown as import("@/src/application/services/ISlipStorage").ISlipStorage;
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const uc = new SaveRiderAvatarUseCase(riders(), storage);
  const first = await uc.execute(s, "image/jpeg", jpeg);
  assert.match(first, new RegExp(`^rider-accounts/${rider.accountId}/.+\\.jpg$`));
  const second = await uc.execute(s, "image/jpeg", jpeg);
  assert.deepEqual(deleted, [first]);
  assert.equal(await riders().findAvatarKey(rider.id), second, "membership id serves the account photo");
  await assert.rejects(async () => uc.execute(s, "image/png", jpeg));
});
