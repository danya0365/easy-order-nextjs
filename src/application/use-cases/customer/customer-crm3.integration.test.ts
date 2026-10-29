import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { CRM_SORTS, CRM_TABS, queryCrm, summarize } from "@/src/domain/services/customer-crm";
import { CRM_PERMS, assertCrmCan, crmCan, crmFullPhone } from "@/src/domain/services/crm-permissions";
import { GetCustomerOrderHistoryUseCase } from "@/src/application/use-cases/member/GetCustomerOrderHistoryUseCase";

let shopA: string, shopB: string, slugA: string;
const ids: string[] = [];
let foreign: string;

describe("CRM-3 server-side list (SQL) parity", () => {
  before(async () => {
    await migrateTestDb();
    const A = await seedShop("crm3-a");
    const B = await seedShop("crm3-b");
    shopA = A.shop.id; shopB = B.shop.id; slugA = A.shop.slug;
    for (let i = 0; i < 37; i++) {
      const c = await container.customerRepository.findOrCreate(shopA, `08${String(10000000 + i * 7).padStart(8, "0")}`, i % 3 ? `Cust ${i}` : `ลูกค้า_${i}%`);
      ids.push(c.id);
      if (i % 5 === 0) await container.customerCrmRepository.setTags(shopA, c.id, ["vip"]);
      if (i % 7 === 0) await container.customerRepository.requestOnlineOrderMembership(shopA, c.id, new Date().toISOString());
    }
    foreign = (await container.customerRepository.findOrCreate(shopB, "0810000000", "Foreign")).id;
  });

  it("searchPage matches in-memory queryCrm for every tab/sort, with correct counts & pages", async () => {
    const all = await container.customerCrmRepository.listWithStats(shopA);
    const now = Date.now();
    for (const tab of CRM_TABS) {
      for (const sort of CRM_SORTS) {
        for (const q of ["", "Cust 1", "081", "_", "%"]) {
          const expected = queryCrm(all, { tab, sort, q }, now).map((r) => r.id);
          const p1 = await container.customerCrmRepository.searchPage(shopA, { tab, sort, q }, { page: 1, size: 25, now });
          const p2 = await container.customerCrmRepository.searchPage(shopA, { tab, sort, q }, { page: 2, size: 25, now });
          assert.equal(p1.total, expected.length, `${tab}/${sort}/${q} total`);
          assert.deepEqual(new Set([...p1.items, ...p2.items].map((r) => r.id)), new Set(expected), `${tab}/${sort}/${q} ids`);
          assert.ok(p1.items.length <= 25);
          assert.ok(!p1.items.some((r) => r.id === foreign));
        }
      }
    }
  });

  it("overview counts equal summarize() + tab totals; foreign shop excluded", async () => {
    const all = await container.customerCrmRepository.listWithStats(shopA);
    const now = Date.now();
    const ov = await container.customerCrmRepository.overview(shopA, now);
    assert.equal(ov.summary.total, summarize(all).total);
    for (const tab of CRM_TABS) assert.equal(ov.tabs[tab], queryCrm(all, { tab }, now).length, tab);
  });

  it("matchingIds honours cap and never leaks foreign ids", async () => {
    const r = await container.customerCrmRepository.matchingIds(shopA, { tab: "all" }, 10);
    assert.equal(r.ids.length, 10);
    assert.equal(r.overCap, true);
    const r2 = await container.customerCrmRepository.matchingIds(shopA, { tab: "all" }, 500);
    assert.equal(r2.overCap, false);
    assert.equal(r2.ids.length, 37);
    assert.ok(!r2.ids.includes(foreign));
    const ex = await container.customerCrmRepository.exportRows(shopA, { tab: "all" }, { ids: [ids[0], foreign], cap: 100 });
    assert.deepEqual(ex.rows.map((x) => x.id), [ids[0]]);
  });
});

describe("CRM-3 permission matrix", () => {
  it("staff may view/approve/note/redeem; owner-only ops are denied", () => {
    for (const p of ["view", "approve", "note", "redeem", "exportMasked"] as const) {
      assert.ok(crmCan("staff", p), p);
      assert.ok(crmCan("owner", p), p);
    }
    for (const p of ["editName", "tags", "points", "block", "newMember", "resetDevices", "pdpa", "rejectSuspicious", "bulkBlock"] as const) {
      assert.equal(crmCan("staff", p), false, p);
      assert.ok(crmCan("owner", p), p);
      assert.throws(() => assertCrmCan("staff", p));
    }
    assert.ok(Object.keys(CRM_PERMS).length >= 14);
    assert.equal(crmFullPhone("staff", false), false);
    assert.equal(crmFullPhone("owner", true), false);
    assert.equal(crmFullPhone("owner", false), true);
  });
});

describe("CRM-3 reset devices invalidates the member cookie", () => {
  it("old device token stops resolving and order history returns null", async () => {
    const cid = ids[1];
    const { token } = await container.customerDeviceRepository.create(cid);
    const uc = new GetCustomerOrderHistoryUseCase(container.shopRepository, container.customerDeviceRepository, container.orderRepository);
    assert.ok(await container.customerDeviceRepository.findByToken(token));
    assert.ok(await uc.execute(slugA, token));
    await container.customerDeviceRepository.deleteByCustomer(cid);
    assert.equal(await container.customerDeviceRepository.findByToken(token), null);
    assert.equal(await uc.execute(slugA, token), null);
  });
});
