import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { LOCK_THRESHOLD } from "./LoginSecurityService";

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

const sec = () => container.loginSecurity;

test("locks an account after threshold failures + alerts admins once", async () => {
  const admin = await adminUser("sec-admin@test.local");
  const { shop, ownerId } = await seedShop("sec-lock");
  const email = "sec-lock@test.local"; // seedShop owner email = `${slug}@test.local`

  // Below threshold → not locked yet.
  for (let i = 0; i < LOCK_THRESHOLD - 1; i++) {
    await sec().recordFailure({ email, ip: "1.2.3.4", userAgent: null, method: "password" });
  }
  await sec().assertNotLocked(email); // should NOT throw

  // The crossing failure locks the account + alerts admins.
  await sec().recordFailure({ email, ip: "1.2.3.4", userAgent: null, method: "password" });
  await assert.rejects(sec().assertNotLocked(email), /ล็อก/);

  const adminNotis = await container.notificationRepository.listByUser(admin.id);
  const alerts = adminNotis.filter((n) => n.type === "security_alert");
  assert.equal(alerts.length, 1, "exactly one brute-force alert (fires once at threshold)");

  // The account's owner is warned directly too (it's their account).
  const ownerNotis = await container.notificationRepository.listByUser(ownerId);
  assert.equal(
    ownerNotis.filter((n) => n.type === "security_alert").length,
    1,
    "owner notified their own account was attacked",
  );
  assert.ok(shop, "shop seeded");
});

test("unknown email never locks (per-IP rate limit handles it)", async () => {
  await sec().assertNotLocked("nobody@nowhere.test"); // should NOT throw
});
