import { before, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";

// --- Mock the Next request-context modules the order actions import. ---------
let sessionToken: string | null = null; // es_session (operator / POS)
let kioskToken: string | null = null; // eo_kiosk (kiosk device)
// Shop QR gate: cookies written by setOrderAccessCookie (test helper sets them).
const accessCookies = new Map<string, string>();
const cookieStore = {
  get: (name: string) => {
    if (name === "es_session" && sessionToken) return { value: sessionToken };
    if (name === "eo_kiosk" && kioskToken) return { value: kioskToken };
    if (name.startsWith("eo_order_")) {
      const v = accessCookies.get(name);
      return v ? { value: v } : undefined;
    }
    return undefined;
  },
  set: (name: string, value: string) => {
    if (name.startsWith("eo_order_")) accessCookies.set(name, value);
  },
  delete: () => {},
};
const headerStore = new Map<string, string>([["x-forwarded-for", "203.0.113.8"]]);

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

type Actions = typeof import("./order-actions");
let actions: Actions;

async function loginAs(userId: string): Promise<void> {
  const s = await container.sessionRepository.create({
    userId,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    userAgent: "test",
    ip: "203.0.113.8",
  });
  sessionToken = s.id;
}

/** Turn this "device" into a kiosk for `shopId` (sets the eo_kiosk cookie). */
async function activateKiosk(shopId: string): Promise<void> {
  const s = await container.kioskSessionRepository.create({
    shopId,
    expiresAt: new Date(Date.now() + 12 * 3600_000).toISOString(),
  });
  kioskToken = s.id;
}

async function menuItem(shopId: string, priceSatang = 6000) {
  const cat = await container.menuCategoryRepository.create({ shopId, name: "หมวด" });
  return container.menuItemRepository.create({
    shopId,
    categoryId: cat.id,
    name: "อเมริกาโน่",
    priceSatang,
  });
}

/** Simulate this device having scanned the shop's order QR (claim cookie). */
async function grantOnlineAccess(slug: string, shopId: string): Promise<void> {
  const { setOrderAccessCookie } = await import(
    "@/src/infrastructure/auth/order-access"
  );
  await setOrderAccessCookie(slug, shopId);
}

before(async () => {
  await migrateTestDb();
  // Shop QR gate signing secret (read at call time by the auth helper).
  process.env.ORDER_ACCESS_SECRET = "test-order-access-secret";
  actions = await import("./order-actions");
});
beforeEach(() => {
  sessionToken = null;
  kioskToken = null;
  accessCookies.clear();
  // Neutralize outbound fetch (LINE/email new-order notify) — fail-soft.
  global.fetch = (async () => new Response("", { status: 200 })) as typeof fetch;
});

test("placeOrderAction: kiosk order prices from DB, shop from the session", async () => {
  const { shop } = await seedShop("ord-act-a");
  const item = await menuItem(shop.id, 6000);
  await activateKiosk(shop.id);

  const res = await actions.placeOrderAction({
    cart: [{ menuItemId: item.id, quantity: 2 }],
    paymentMethod: "cash",
  });

  assert.ok(res.ok, res.error);
  assert.equal(res.totalSatang, 12000); // 2 × DB price, not client-supplied
  assert.equal(res.orderNo, 1);
  // The order really landed under this shop's queue.
  const active = await container.orderRepository.listActiveByShop(shop.id);
  assert.equal(active.length, 1);
  assert.equal(active[0].performedBy, null); // kiosk self-serve
});

test("placeOrderAction: no kiosk session → rejected (can't order off-premise)", async () => {
  const { shop } = await seedShop("ord-act-b");
  const item = await menuItem(shop.id);
  kioskToken = null; // not a kiosk device

  const res = await actions.placeOrderAction({
    cart: [{ menuItemId: item.id, quantity: 1 }],
    paymentMethod: "cash",
  });
  assert.ok(res.error, "should be rejected");
  assert.ok(!res.ok);
});

test("placeOrderAction: an item from another shop can't be ordered via this kiosk", async () => {
  const a = await seedShop("ord-act-c");
  const b = await seedShop("ord-act-d");
  const itemB = await menuItem(b.shop.id); // belongs to shop B
  await activateKiosk(a.shop.id); // device is shop A's kiosk

  const res = await actions.placeOrderAction({
    cart: [{ menuItemId: itemB.id, quantity: 1 }],
    paymentMethod: "cash",
  });
  assert.ok(res.error, "cross-shop item must be rejected");
  assert.equal((await container.orderRepository.listActiveByShop(a.shop.id)).length, 0);
});

test("placeOrderForCustomerAction: POS order records the operator (performedBy)", async () => {
  const { shop, ownerId } = await seedShop("ord-act-e");
  const item = await menuItem(shop.id, 4500);
  await loginAs(ownerId); // authenticated operator, NOT a kiosk

  const res = await actions.placeOrderForCustomerAction({
    cart: [{ menuItemId: item.id, quantity: 1 }],
    paymentMethod: "cash",
    customerName: "ลูกค้า",
    customerPhone: "0891112222",
  });

  assert.ok(res.ok, res.error);
  const active = await container.orderRepository.listActiveByShop(shop.id);
  assert.equal(active.length, 1);
  assert.equal(active[0].performedBy, ownerId); // counter accountability
});

test("selfConfirmOrderAction: self-service shop marks the order paid + completed", async () => {
  const { shop } = await seedShop("ord-act-self");
  await container.shopRepository.setSelfService(shop.id, true);
  const item = await menuItem(shop.id, 5000);
  await activateKiosk(shop.id);

  const placed = await actions.placeOrderAction({
    cart: [{ menuItemId: item.id, quantity: 1 }],
    paymentMethod: "cash",
  });
  assert.ok(placed.ok && placed.orderId, placed.error);

  const res = await actions.selfConfirmOrderAction(placed.orderId!);
  assert.ok(res.ok, res.error);
  assert.equal(res.orderNo, placed.orderNo);

  // The order is now paid + completed (leaves the active queue, no staff needed).
  const order = await container.orderRepository.findById(shop.id, placed.orderId!);
  assert.equal(order?.paymentStatus, "paid");
  assert.equal(order?.status, "completed");
  assert.equal((await container.orderRepository.listActiveByShop(shop.id)).length, 0);
});

test("selfConfirmOrderAction: rejected when the shop is NOT in self-service mode", async () => {
  const { shop } = await seedShop("ord-act-nonself"); // selfService defaults false
  const item = await menuItem(shop.id);
  await activateKiosk(shop.id);

  const placed = await actions.placeOrderAction({
    cart: [{ menuItemId: item.id, quantity: 1 }],
    paymentMethod: "cash",
  });
  assert.ok(placed.ok && placed.orderId, placed.error);

  const res = await actions.selfConfirmOrderAction(placed.orderId!);
  assert.ok(res.error, "non-self-service shop must reject self-confirm");

  // Order stays pending + unpaid (staff would handle it).
  const order = await container.orderRepository.findById(shop.id, placed.orderId!);
  assert.equal(order?.paymentStatus, "unpaid");
  assert.equal(order?.status, "pending");
});

test("placeOnlineOrderAction: no order-access cookie → rejected (QR gate)", async () => {
  const { shop } = await seedShop("ord-act-online-a");
  const item = await menuItem(shop.id);
  accessCookies.clear(); // never scanned the QR

  const res = await actions.placeOnlineOrderAction({
    slug: shop.slug,
    cart: [{ menuItemId: item.id, quantity: 1 }],
    paymentMethod: "cash",
    fulfillmentType: "pickup",
  });
  assert.ok(res.error, "must be rejected without the QR claim cookie");
  assert.ok(res.error!.includes("ต้องสแกน QR"));
  assert.equal((await container.orderRepository.listActiveByShop(shop.id)).length, 0);
});

test("placeOnlineOrderAction: valid order-access cookie for this shop → passes the gate", async () => {
  const { shop } = await seedShop("ord-act-online-b");
  await container.shopRepository.updateSettings(shop.id, {
    onlineOrderingEnabled: true,
    pickupEnabled: true,
  });
  const item = await menuItem(shop.id);
  // The claim route would set this cookie after verifying the QR token.
  await grantOnlineAccess(shop.slug, shop.id);

  const res = await actions.placeOnlineOrderAction({
    slug: shop.slug,
    cart: [{ menuItemId: item.id, quantity: 1 }],
    paymentMethod: "cash",
    fulfillmentType: "pickup",
    customerName: "ทดสอบ",
    customerPhone: "0812345678",
  });
  assert.ok(res.ok, res.error);
  assert.equal((await container.orderRepository.listActiveByShop(shop.id)).length, 1);
});

test("placeOnlineOrderAction: cookie minted for ANOTHER shop → rejected", async () => {
  const a = await seedShop("ord-act-online-c");
  const b = await seedShop("ord-act-online-d");
  const itemA = await menuItem(a.shop.id);
  // Device scanned shop B's QR, then tries to order from shop A.
  await grantOnlineAccess(b.shop.slug, b.shop.id);

  const res = await actions.placeOnlineOrderAction({
    slug: a.shop.slug,
    cart: [{ menuItemId: itemA.id, quantity: 1 }],
    paymentMethod: "cash",
    fulfillmentType: "pickup",
  });
  assert.ok(res.error, "cross-shop order-access cookie must be rejected");
  assert.equal((await container.orderRepository.listActiveByShop(a.shop.id)).length, 0);
});
