import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb } from "@/src/test/helpers";
import { db, schema } from "@/src/infrastructure/db/client";
import { checkShopOwner } from "@/src/infrastructure/auth/owner-check";

const future = () => new Date(Date.now() + 86_400_000).toISOString();

before(async () => {
  await migrateTestDb();
});

test("checkShopOwner: owner of THIS shop only, valid session only", async () => {
  const [a] = await db.insert(schema.shops).values({ name: "A", slug: "oc-a" }).returning();
  await db.insert(schema.shops).values({ name: "B", slug: "oc-b" });
  const [u] = await db
    .insert(schema.users)
    .values({ email: "oc-owner@test", passwordHash: "x", role: "shop_owner", shopId: a.id })
    .returning();
  const [s] = await db.insert(schema.sessions).values({ userId: u.id, expiresAt: future() }).returning();
  const [old] = await db
    .insert(schema.sessions)
    .values({ userId: u.id, expiresAt: new Date(Date.now() - 1000).toISOString() })
    .returning();

  assert.deepEqual(await checkShopOwner(s.id, "oc-a"), { owner: true, href: "/shop" });
  assert.deepEqual(await checkShopOwner(s.id, "oc-b"), { owner: false });
  assert.deepEqual(await checkShopOwner(old.id, "oc-a"), { owner: false });
  assert.deepEqual(await checkShopOwner("nope", "oc-a"), { owner: false });
});
