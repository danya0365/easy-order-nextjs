import { before, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";

let sessionToken: string | null = null; // es_session (owner)
let kioskToken: string | null = null; // eo_kiosk (device)
const cookieStore = {
  get: (name: string) => {
    if (name === "es_session" && sessionToken) return { value: sessionToken };
    if (name === "eo_kiosk" && kioskToken) return { value: kioskToken };
    return undefined;
  },
  set: () => {},
  delete: () => {
    kioskToken = null;
  },
};
const headerStore = new Map<string, string>([["x-forwarded-for", "203.0.113.10"]]);

mock.module("next/headers", {
  namedExports: {
    cookies: async () => cookieStore,
    headers: async () => headerStore,
  },
});
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });
mock.module("next/navigation", {
  namedExports: { redirect: () => { throw new Error("REDIRECT"); } },
});

type Actions = typeof import("./kiosk-actions");
let actions: Actions;

async function loginAs(userId: string): Promise<void> {
  const s = await container.sessionRepository.create({
    userId,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    userAgent: "test",
    ip: "203.0.113.10",
  });
  sessionToken = s.id;
}

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

before(async () => {
  await migrateTestDb();
  actions = await import("./kiosk-actions");
});
beforeEach(() => {
  sessionToken = null;
  kioskToken = null;
});

test("setKioskPinAction requires authentication", async () => {
  const res = await actions.setKioskPinAction({}, form({ pin: "1234" }));
  assert.ok(res.error);
});

test("owner sets a PIN → shop.hasKioskPin; activation then works (redirect)", async () => {
  const { shop, ownerId } = await seedShop("kio-a");
  await loginAs(ownerId);

  // Can't activate before a PIN exists.
  const early = await actions.activateKioskAction({}, form({ label: "iPad" }));
  assert.match(early.error ?? "", /PIN/);

  // Set the PIN.
  const set = await actions.setKioskPinAction({}, form({ pin: "4321" }));
  assert.ok(set.success, set.error);
  const shopRow = await container.shopRepository.findById(shop.id);
  assert.equal(shopRow?.hasKioskPin, true);

  // Now activation creates a kiosk session row + redirects.
  await assert.rejects(
    actions.activateKioskAction({}, form({ label: "iPad หน้าร้าน" })),
    /REDIRECT/,
  );
  assert.equal((await container.kioskSessionRepository.listByShop(shop.id)).length, 1);
});

test("exitKioskAction: wrong PIN rejected, correct PIN revokes the session", async () => {
  const { shop, ownerId } = await seedShop("kio-b");
  await loginAs(ownerId);
  await actions.setKioskPinAction({}, form({ pin: "9999" }));

  // Stand up a kiosk device session + cookie.
  const ses = await container.kioskSessionRepository.create({
    shopId: shop.id,
    expiresAt: new Date(Date.now() + 12 * 3600_000).toISOString(),
  });
  kioskToken = ses.id;

  // Wrong PIN → rejected, session still alive.
  const bad = await actions.exitKioskAction({}, form({ pin: "0000" }));
  assert.match(bad.error ?? "", /PIN/);
  assert.ok(await container.kioskSessionRepository.findValid(ses.id, new Date()));

  // Correct PIN → revokes the row (redirect).
  await assert.rejects(
    actions.exitKioskAction({}, form({ pin: "9999" })),
    /REDIRECT/,
  );
  assert.equal(await container.kioskSessionRepository.findValid(ses.id, new Date()), null);
});
