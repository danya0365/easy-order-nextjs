import { before, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { ensurePathAliases } from "@/src/test/ensure-path-aliases";
import { container } from "@/src/infrastructure/di/container";

// --- Request-context mocks (session, kiosk, QR-gate + branch cookies). -------
let sessionToken: string | null = null;
let kioskToken: string | null = null;
const jar = new Map<string, string>();
const cookieStore = {
  get: (name: string) => {
    if (name === "es_session" && sessionToken) return { value: sessionToken };
    if (name === "eo_kiosk" && kioskToken) return { value: kioskToken };
    const v = jar.get(name);
    return v ? { value: v } : undefined;
  },
  set: (name: string, value: string) => {
    if (name === "eo_kiosk") kioskToken = value;
    else jar.set(name, value);
  },
  delete: (name: string) => {
    jar.delete(name);
  },
};
const headerStore = new Map<string, string>([["x-forwarded-for", "203.0.113.77"]]);
mock.module("next/headers", {
  namedExports: { cookies: async () => cookieStore, headers: async () => headerStore },
});
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });
mock.module("next/navigation", {
  namedExports: { redirect: () => { throw new Error("REDIRECT"); } },
});
ensurePathAliases();

type OrderActions = typeof import("./order-actions");
type KioskActions = typeof import("./kiosk-actions");
type BranchActions = typeof import("./branch-actions");
type OrderBranchActions = typeof import("./order-branch-actions");
let orders: OrderActions;
let kiosk: KioskActions;
let branchActs: BranchActions;
let pick: OrderBranchActions;

async function loginAs(userId: string): Promise<void> {
  const s = await container.sessionRepository.create({
    userId,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    userAgent: "test",
    ip: "203.0.113.77",
  });
  sessionToken = s.id;
}

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

async function setup(slug: string) {
  const { shop, ownerId } = await seedShop(slug);
  const [main] = await container.branchRepository.listByShop(shop.id);
  const b2 = await container.branchRepository.create({ shopId: shop.id, name: "สาขา 2" });
  const staff = await container.userRepository.create({
    email: `${slug}-staff@test.local`,
    passwordHash: "x",
    role: "branch_staff",
    shopId: shop.id,
    branchId: b2.id,
  });
  const cat = await container.menuCategoryRepository.create({ shopId: shop.id, name: "หมวด" });
  const item = await container.menuItemRepository.create({
    shopId: shop.id,
    categoryId: cat.id,
    name: "ข้าวผัด",
    priceSatang: 5000,
  });
  return { shop, ownerId, main, b2, staff, item };
}

const cart = (id: string) => [{ menuItemId: id, quantity: 1 }];

before(async () => {
  await migrateTestDb();
  process.env.ORDER_ACCESS_SECRET = "test-order-access-secret";
  orders = await import("./order-actions");
  kiosk = await import("./kiosk-actions");
  branchActs = await import("./branch-actions");
  pick = await import("./order-branch-actions");
});
beforeEach(() => {
  sessionToken = null;
  kioskToken = null;
  jar.clear();
});

test("kiosk activation binds the device to the chosen branch; foreign branch rejected", async () => {
  const a = await setup("mb2-kiosk");
  const other = await setup("mb2-kiosk-other");
  await loginAs(a.ownerId);
  await kiosk.setKioskPinAction({}, form({ pin: "1234" }));

  const bad = await kiosk.activateKioskAction({}, form({ label: "x", branchId: other.b2.id }));
  assert.ok(bad.error);

  await assert.rejects(
    kiosk.activateKioskAction({}, form({ label: "ตู้สาขา 2", branchId: a.b2.id })),
    /REDIRECT/,
  );
  const sessions = await container.kioskSessionRepository.listByShop(a.shop.id);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].branchId, a.b2.id);

  // Main branch closed must NOT block the branch-2 kiosk.
  await container.branchRepository.setAcceptingOrders(a.main.id, false);
  sessionToken = null;
  kioskToken = sessions[0].id;
  const placed = await orders.placeOrderAction({ cart: cart(a.item.id), paymentMethod: "cash" });
  assert.ok(placed.ok, placed.error);
  assert.equal((await container.orderRepository.findById(a.shop.id, placed.orderId!))?.branchId, a.b2.id);
  assert.equal(placed.branchName, "สาขา 2");

  // Branch-2 closed → its kiosk is blocked.
  await container.branchRepository.setAcceptingOrders(a.b2.id, false);
  const blocked = await orders.placeOrderAction({ cart: cart(a.item.id), paymentMethod: "cash" });
  assert.match(blocked.error ?? "", /ปิดรับออเดอร์/);
});

test("walk-in: staff fixed to own branch; owner may pick any own branch", async () => {
  const a = await setup("mb2-counter");
  const other = await setup("mb2-counter-other");

  await loginAs(a.staff.id);
  const denied = await orders.placeOrderForCustomerAction({
    cart: cart(a.item.id), paymentMethod: "cash", branchId: a.main.id,
  });
  assert.match(denied.error ?? "", /เฉพาะสาขาของตัวเอง/);
  const ok = await orders.placeOrderForCustomerAction({ cart: cart(a.item.id), paymentMethod: "cash" });
  assert.ok(ok.ok, ok.error);
  assert.equal((await container.orderRepository.findById(a.shop.id, ok.orderId!))?.branchId, a.b2.id);

  await loginAs(a.ownerId);
  const foreign = await orders.placeOrderForCustomerAction({
    cart: cart(a.item.id), paymentMethod: "cash", branchId: other.b2.id,
  });
  assert.ok(foreign.error);
  const picked = await orders.placeOrderForCustomerAction({
    cart: cart(a.item.id), paymentMethod: "cash", branchId: a.b2.id,
  });
  assert.ok(picked.ok, picked.error);
  assert.equal((await container.orderRepository.findById(a.shop.id, picked.orderId!))?.branchId, a.b2.id);
  assert.equal(jar.get("eo_counter_branch"), a.b2.id); // last-used remembered
});

test("staff cancel: allowed by default, blocked by shop or platform switch, own branch only", async () => {
  const a = await setup("mb2-cancel");
  await loginAs(a.ownerId);
  const mk = async (branchId: string) =>
    (await orders.placeOrderForCustomerAction({ cart: cart(a.item.id), paymentMethod: "cash", branchId })).orderId!;
  const o1 = await mk(a.b2.id);
  const o2 = await mk(a.b2.id);
  const o3 = await mk(a.b2.id);
  const mainOrder = await mk(a.main.id);

  await loginAs(a.staff.id);
  assert.deepEqual(await orders.advanceOrderStatusAction(o1, "cancelled", "ลูกค้าเปลี่ยนใจ"), {});
  assert.match((await orders.advanceOrderStatusAction(mainOrder, "cancelled", "x y")).error ?? "", /สาขาอื่น/);

  await loginAs(a.ownerId);
  assert.deepEqual(await branchActs.setBranchStaffCanCancelAction(false), {});
  await loginAs(a.staff.id);
  assert.match((await orders.advanceOrderStatusAction(o2, "cancelled", "ลองยกเลิก")).error ?? "", /ไม่อนุญาต/);

  await loginAs(a.ownerId);
  await branchActs.setBranchStaffCanCancelAction(true);
  await container.platformSettingsRepository.update({ branchStaffCancelEnabled: false });
  try {
    await loginAs(a.staff.id);
    assert.match((await orders.advanceOrderStatusAction(o3, "cancelled", "ลองยกเลิก")).error ?? "", /ไม่อนุญาต/);
    // Owner can always cancel.
    await loginAs(a.ownerId);
    assert.deepEqual(await orders.advanceOrderStatusAction(o3, "cancelled", "เจ้าของยกเลิก"), {});
  } finally {
    await container.platformSettingsRepository.update({ branchStaffCancelEnabled: true });
  }
});

test("customer branch switch: needs shop QR access, only open branches of that shop", async () => {
  const a = await setup("mb2-switch");
  const other = await setup("mb2-switch-other");

  // No QR access → refused.
  assert.ok((await pick.selectOrderBranchAction(a.shop.slug, a.b2.id)).error);

  const { setOrderAccessCookie, getOrderBranchId } = await import("@/src/infrastructure/auth/order-access");
  await setOrderAccessCookie(a.shop.slug, a.shop.id);

  assert.ok((await pick.selectOrderBranchAction(a.shop.slug, other.b2.id)).error); // other shop
  await container.branchRepository.setAcceptingOrders(a.b2.id, false);
  assert.match((await pick.selectOrderBranchAction(a.shop.slug, a.b2.id)).error ?? "", /ปิดรับออเดอร์/);
  await container.branchRepository.setAcceptingOrders(a.b2.id, true);

  assert.deepEqual(await pick.selectOrderBranchAction(a.shop.slug, a.b2.id), {});
  assert.equal(await getOrderBranchId(a.shop.slug, a.shop.id), a.b2.id);

  // Online order now lands in branch 2 and echoes the branch name.
  await container.shopRepository.updateSettings(a.shop.id, {
    onlineOrderingEnabled: true,
    pickupEnabled: true,
  });
  const res = await orders.placeOnlineOrderAction({
    slug: a.shop.slug,
    cart: cart(a.item.id),
    paymentMethod: "cash",
    fulfillmentType: "pickup",
    customerName: "ทดสอบ",
    customerPhone: "0810000001",
  });
  assert.ok(res.ok, res.error);
  assert.equal(res.branchName, "สาขา 2");
});
