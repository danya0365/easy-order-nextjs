import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";

before(async () => {
  await migrateTestDb();
});

async function adminUser(email: string) {
  const passwordHash = await container.passwordHasher.hash("password123");
  return container.userRepository.create({
    email,
    passwordHash,
    role: "platform_admin",
    shopId: null,
    branchId: null,
  });
}

test("allows under the limit, blocks over it, and alerts admins exactly once", async () => {
  const admin = await adminUser("guard-admin@test.local");
  const opts = {
    key: "test_action:shopX:userY",
    limit: 2,
    windowMs: 60_000,
    shopId: "shopX",
    actorUserId: "userY",
    alertTitle: "⚠️ test",
    alertBody: "too fast",
  };

  assert.equal((await container.sensitiveActionGuard.check(opts)).allowed, true);
  assert.equal((await container.sensitiveActionGuard.check(opts)).allowed, true);
  // 3rd and 4th exceed the limit → blocked.
  assert.equal((await container.sensitiveActionGuard.check(opts)).allowed, false);
  assert.equal((await container.sensitiveActionGuard.check(opts)).allowed, false);

  const alerts = (await container.notificationRepository.listByUser(admin.id)).filter(
    (n) => n.type === "security_alert",
  );
  assert.equal(alerts.length, 1, "alerted admins once despite repeated breaches");
});
