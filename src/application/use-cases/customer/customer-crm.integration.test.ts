import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { AdjustCustomerPointsUseCase, BulkCustomerUseCase, BlockCustomerUseCase } from "./CustomerCrmUseCases";
import { queryCrm, summarize, toCsv, maskPhone, normalizeTags, signupChannel, monthStartBangkok } from "@/src/domain/services/customer-crm";

const bulk = () =>
  new BulkCustomerUseCase(container.customerRepository, container.customerCrmRepository, container.memberSignupGuardRepository);
const blocker = () =>
  new BlockCustomerUseCase(container.customerRepository, container.customerCrmRepository, container.memberSignupGuardRepository);

let shopA: string, shopB: string, ownerA: string, a1: string, a2: string, b1: string;

describe("customer CRM (list)", () => {
  before(async () => {
    await migrateTestDb();
    const A = await seedShop("crm-a");
    const B = await seedShop("crm-b");
    shopA = A.shop.id; shopB = B.shop.id; ownerA = A.ownerId;
    a1 = (await container.customerRepository.findOrCreate(shopA, "0811111111", "Alice")).id;
    a2 = (await container.customerRepository.findOrCreate(shopA, "0822222222", "Bob")).id;
    b1 = (await container.customerRepository.findOrCreate(shopB, "0811111111", "Alice-B")).id;
    await container.customerRepository.requestOnlineOrderMembership(shopA, a2, new Date().toISOString());
  });

  it("listWithStats is shop-scoped", async () => {
    const rows = await container.customerCrmRepository.listWithStats(shopA);
    assert.deepEqual(rows.map((r) => r.id).sort(), [a1, a2].sort());
    assert.ok(!rows.some((r) => r.id === b1));
    assert.equal(summarize(rows).total, 2);
  });

  it("bulk ops skip foreign ids (no cross-shop leakage)", async () => {
    const r = await bulk().block(shopA, [a1, b1], ownerA);
    assert.deepEqual(r.done, [a1]);
    assert.deepEqual(r.skipped, [b1]);
    assert.equal((await container.customerRepository.findById(shopB, b1))!.blockedAt, null);
    assert.ok((await container.customerRepository.findById(shopA, a1))!.blockedAt);
    assert.equal(await container.memberSignupGuardRepository.isPhoneBlocked(shopB, "0811111111"), false);
    assert.equal(await container.memberSignupGuardRepository.isPhoneBlocked(shopA, "0811111111"), true);
    await blocker().unblock(shopA, a1);
    assert.equal((await container.customerRepository.findById(shopA, a1))!.blockedAt, null);
    assert.equal(await container.memberSignupGuardRepository.isPhoneBlocked(shopA, "0811111111"), false);
  });

  it("crm writes refuse other shop's customer", async () => {
    assert.equal(await container.customerCrmRepository.updateProfile(shopA, b1, { note: "x" }), false);
    assert.equal(await container.customerCrmRepository.setTags(shopA, b1, ["vip"]), false);
    assert.equal((await container.customerRepository.findById(shopB, b1))!.note, null);
  });

  it("tabs / search / sort / csv", async () => {
    await container.customerCrmRepository.setTags(shopA, a1, ["vip"]);
    const rows = await container.customerCrmRepository.listWithStats(shopA);
    assert.deepEqual(queryCrm(rows, { tab: "vip" }).map((r) => r.id), [a1]);
    assert.deepEqual(queryCrm(rows, { tab: "all", q: "2222" }).map((r) => r.id), [a2]);
    const csvMasked = toCsv(rows, { fullPhone: false });
    assert.ok(!csvMasked.includes("0811111111"));
    assert.ok(toCsv(rows, { fullPhone: true }).includes("0811111111"));
    assert.equal(maskPhone("0811111111"), "081•••1111");
    assert.deepEqual(normalizeTags([" VIP", "vip", "ลูกค้าประจำ", "bad tag!"]), ["vip", "ลูกค้าประจำ"]);
    assert.equal(signupChannel({ onlineOrderStatus: "none", onlineOrderRequestedAt: null }), "instore");
    assert.equal(monthStartBangkok(Date.parse("2026-10-29T05:00:00Z")), "2026-09-30T17:00:00.000Z");
  });

  it("csv neutralizes formula injection", () => {
    const csv = toCsv([{ id: "x", phone: "0800000000", displayName: "=HYPERLINK(1)", publicCode: "p", onlineOrderStatus: "none", onlineOrderRequestedAt: null, tags: [], note: null, blockedAt: null, newMemberClearedAt: null, createdAt: "", orderCount: 0, totalSpendSatang: 0, lastOrderAt: null, points: 0 }], { fullPhone: true });
    assert.ok(csv.includes("'=HYPERLINK(1)"));
  });
});

describe("customer CRM (detail)", () => {
  const adjust = () =>
    new AdjustCustomerPointsUseCase(container.customerRepository, container.customerCrmRepository, container.loyaltyPointsTransactionRepository);

  it("points adjust: reason required, never below zero, ledger + balance", async () => {
    await assert.rejects(adjust().execute({ shopId: shopA, customerId: a1, delta: 10, reason: "", actorId: ownerA }));
    await assert.rejects(adjust().execute({ shopId: shopA, customerId: a1, delta: 1.5, reason: "ok ok", actorId: ownerA }));
    assert.equal(await adjust().execute({ shopId: shopA, customerId: a1, delta: 10, reason: "goodwill", actorId: ownerA }), 10);
    await assert.rejects(adjust().execute({ shopId: shopA, customerId: a1, delta: -11, reason: "too much", actorId: ownerA }), /ไม่พอ/);
    assert.equal(await adjust().execute({ shopId: shopA, customerId: a1, delta: -10, reason: "revert", actorId: ownerA }), 0);
    const ledger = await container.customerCrmRepository.ledger(shopA, a1);
    assert.deepEqual(ledger.map((l) => [l.type, l.quantity]).sort(), [["adjust", -10], ["adjust", 10]]);
  });

  it("cross-shop: adjust/detail reads refuse foreign customer", async () => {
    await assert.rejects(adjust().execute({ shopId: shopA, customerId: b1, delta: 5, reason: "x-shop", actorId: ownerA }), /ไม่พบ/);
    assert.equal(await container.customerCrmRepository.adjustBalance(shopB, b1, -1), null);
    assert.equal(await container.customerRepository.findById(shopA, b1), null);
    assert.deepEqual(await container.customerCrmRepository.ledger(shopA, b1), []);
    assert.equal((await container.customerCrmRepository.pageOrders(shopA, b1, 1, 10)).total, 0);
    assert.equal((await container.customerCrmRepository.detailStats(shopA, b1)).orderCount, 0);
  });

  it("timeline reads customer audit rows for this shop only", async () => {
    await container.auditLogger.record({ actorUserId: ownerA, actorRole: "shop_owner", action: "customer_tags_updated", targetType: "customer", targetId: a1, shopId: shopA });
    await container.auditLogger.record({ actorUserId: ownerA, actorRole: "shop_owner", action: "customer_tags_updated", targetType: "customer", targetId: a1, shopId: shopB });
    const tl = await container.customerCrmRepository.timeline(shopA, a1);
    assert.equal(tl.length, 1);
  });
});
