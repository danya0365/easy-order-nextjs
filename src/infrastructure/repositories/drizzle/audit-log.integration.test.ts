import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";

before(async () => {
  await migrateTestDb();
});

const repo = () => container.auditLogRepository;

test("create serializes metadata + page filters by shop/actor/action", async () => {
  await repo().create({
    actorUserId: "u1",
    actorRole: "platform_admin",
    action: "login_succeeded",
    shopId: "shopA",
    ip: "1.1.1.1",
    metadata: { method: "password" },
  });
  await repo().create({ action: "login_failed", shopId: "shopA", ip: "9.9.9.9" });
  await repo().create({ action: "login_failed", shopId: "shopB", ip: "9.9.9.9" });

  const byShop = await repo().pageByShop("shopA");
  assert.equal(byShop.items.length, 2, "two events for shopA");

  const byAction = await repo().page({ action: "login_failed" });
  assert.equal(byAction.items.length, 2, "two login_failed across shops");

  const withMeta = await repo().page({ actorUserId: "u1" });
  assert.equal(withMeta.items[0].action, "login_succeeded");
  assert.equal(JSON.parse(withMeta.items[0].metadata!).method, "password");
});

test("countRecent narrows by action + since + ip/actor (brute-force signal)", async () => {
  const t0 = new Date(Date.now() - 60_000).toISOString();
  for (let i = 0; i < 4; i++) {
    await repo().create({ action: "login_failed", ip: "5.5.5.5" });
  }
  const byIp = await repo().countRecent("login_failed", t0, { ip: "5.5.5.5" });
  assert.equal(byIp, 4, "4 recent failures from the IP");

  const future = new Date(Date.now() + 60_000).toISOString();
  assert.equal(
    await repo().countRecent("login_failed", future, { ip: "5.5.5.5" }),
    0,
    "none after the window",
  );
});
