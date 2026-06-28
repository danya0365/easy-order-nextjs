import { before, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";

// --- Mock the Next request-context modules the action graph imports. ---------
// getSession()/getClientIp() read cookies()/headers(); the action calls
// revalidatePath(). We drive the session by swapping `sessionToken` per test.
let sessionToken: string | null = null;
let impersonateCookie: string | null = null;
const cookieStore = {
  get: (name: string) => {
    if (name === "es_session" && sessionToken) return { value: sessionToken };
    if (name === "es_impersonate" && impersonateCookie)
      return { value: impersonateCookie };
    return undefined;
  },
  set: () => {},
  delete: () => {},
};
const headerStore = new Map<string, string>([["x-forwarded-for", "203.0.113.7"]]);

mock.module("next/headers", {
  namedExports: {
    cookies: async () => cookieStore,
    headers: async () => headerStore,
  },
});
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });
mock.module("next/navigation", {
  namedExports: {
    redirect: () => {
      throw new Error("REDIRECT");
    },
  },
});

let anonymizeCustomerAction: typeof import("./customer-actions").anonymizeCustomerAction;

/** Create a real session row for a user and make subsequent calls act as them. */
async function loginAs(userId: string): Promise<void> {
  const session = await container.sessionRepository.create({
    userId,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    userAgent: "test",
    ip: "203.0.113.7",
  });
  sessionToken = session.id;
}

/** Act as a platform_admin impersonating a shop (sets the es_impersonate cookie). */
function impersonate(shopId: string, byAdminId: string): void {
  impersonateCookie = JSON.stringify({
    shopId,
    by: byAdminId,
    exp: Date.now() + 60_000,
  });
}

before(async () => {
  await migrateTestDb();
  ({ anonymizeCustomerAction } = await import("./customer-actions"));
});
beforeEach(() => {
  sessionToken = null;
  impersonateCookie = null;
});

test("owner erases their own customer (PII gone, action ok)", async () => {
  const { shop, ownerId } = await seedShop("act-a");
  const customer = await container.customerRepository.findOrCreate(
    shop.id,
    "0810000001",
    "Somchai",
  );
  await loginAs(ownerId);

  const res = await anonymizeCustomerAction(customer.id);

  assert.deepEqual(res, {});
  const after = (await container.customerRepository.findById(shop.id, customer.id))!;
  assert.equal(after.displayName, "(ลบข้อมูลแล้ว)");
  assert.notEqual(after.phone, "0810000001");
});

test("an owner cannot erase another shop's customer", async () => {
  const a = await seedShop("act-b");
  const b = await seedShop("act-c");
  const victim = await container.customerRepository.findOrCreate(
    a.shop.id,
    "0810000002",
    "Malee",
  );
  await loginAs(b.ownerId); // logged in as a *different* shop's owner

  const res = await anonymizeCustomerAction(victim.id);

  assert.match(res.error ?? "", /ไม่พบลูกค้า/);
  // A's customer is untouched.
  const still = (await container.customerRepository.findById(a.shop.id, victim.id))!;
  assert.equal(still.phone, "0810000002");
});

test("a platform_admin impersonating the shop can erase, audited to the admin", async () => {
  const { shop } = await seedShop("act-e");
  const admin = await container.userRepository.create({
    email: "admin-e@test.local",
    passwordHash: "x",
    role: "platform_admin",
  });
  const customer = await container.customerRepository.findOrCreate(
    shop.id,
    "0810000004",
    "Nid",
  );
  await loginAs(admin.id);
  impersonate(shop.id, admin.id);

  const res = await anonymizeCustomerAction(customer.id);

  assert.deepEqual(res, {});
  const after = (await container.customerRepository.findById(shop.id, customer.id))!;
  assert.equal(after.displayName, "(ลบข้อมูลแล้ว)");
  // Accountability: the audit row attributes the change to the real admin.
  const logs = await container.auditLogRepository.page({ actorUserId: admin.id });
  const erased = logs.items.find((l) => l.action === "customer_erased");
  assert.ok(erased, "customer_erased audit recorded");
  assert.equal(erased!.shopId, shop.id);
});

test("a platform_admin WITHOUT impersonation cannot erase", async () => {
  const { shop } = await seedShop("act-f");
  const admin = await container.userRepository.create({
    email: "admin-f@test.local",
    passwordHash: "x",
    role: "platform_admin",
  });
  const customer = await container.customerRepository.findOrCreate(
    shop.id,
    "0810000005",
    "Ploy",
  );
  await loginAs(admin.id); // logged in, but not impersonating any shop

  const res = await anonymizeCustomerAction(customer.id);

  assert.match(res.error ?? "", /ไม่มีสิทธิ์|ไม่พบ/);
  const still = (await container.customerRepository.findById(shop.id, customer.id))!;
  assert.equal(still.phone, "0810000005");
});

test("an unauthenticated call is rejected", async () => {
  const { shop } = await seedShop("act-d");
  const customer = await container.customerRepository.findOrCreate(
    shop.id,
    "0810000003",
    "Anan",
  );
  sessionToken = null; // no session

  const res = await anonymizeCustomerAction(customer.id);

  assert.match(res.error ?? "", /เข้าสู่ระบบ|สิทธิ์/);
});
