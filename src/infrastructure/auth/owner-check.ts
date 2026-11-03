import "server-only";

import { and, eq, gt } from "drizzle-orm";

import { db, schema } from "@/src/infrastructure/db/client";

export type OwnerCheckResult = { owner: false } | { owner: true; href: string };

/**
 * Is the session behind `token` an active owner/staff of the shop `slug`?
 * ONE indexed query: sessions(pk) ⋈ users(pk) ⋈ shops(id = users.shopId,
 * slug unique). Used only by the client-side owner shortcut on /s/[slug].
 */
export async function checkShopOwner(
  token: string,
  slug: string,
  now: Date = new Date(),
): Promise<OwnerCheckResult> {
  const [row] = await db
    .select({ role: schema.users.role })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .innerJoin(schema.shops, eq(schema.shops.id, schema.users.shopId))
    .where(
      and(
        eq(schema.sessions.id, token),
        gt(schema.sessions.expiresAt, now.toISOString()),
        eq(schema.users.isActive, true),
        eq(schema.shops.slug, slug),
      ),
    )
    .limit(1);
  if (!row) return { owner: false };
  if (row.role === "shop_owner") return { owner: true, href: "/shop" };
  if (row.role === "branch_staff") return { owner: true, href: "/staff" };
  return { owner: false };
}
