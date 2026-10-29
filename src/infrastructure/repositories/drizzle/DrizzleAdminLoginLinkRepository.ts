import "server-only";

import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type {
  AdminLoginLink,
  CreateAdminLoginLinkInput,
  IAdminLoginLinkRepository,
} from "@/src/application/repositories/IAdminLoginLinkRepository";

const t = schema.adminLoginLinks;
type Row = typeof t.$inferSelect;

const toLink = (r: Row): AdminLoginLink => ({
  id: r.id,
  shopId: r.shopId,
  tokenHash: r.tokenHash,
  createdBy: r.createdBy,
  targetUserId: r.targetUserId ?? null,
  createdAt: r.createdAt,
  expiresAt: r.expiresAt,
  usedAt: r.usedAt ?? null,
  usedByUserId: r.usedByUserId ?? null,
  revokedAt: r.revokedAt ?? null,
});

export class DrizzleAdminLoginLinkRepository implements IAdminLoginLinkRepository {
  async create(input: CreateAdminLoginLinkInput): Promise<AdminLoginLink> {
    const [row] = await db.insert(t).values(input).returning();
    return toLink(row);
  }

  async findByTokenHash(tokenHash: string): Promise<AdminLoginLink | null> {
    const [row] = await db.select().from(t).where(eq(t.tokenHash, tokenHash)).limit(1);
    return row ? toLink(row) : null;
  }

  async findById(id: string): Promise<AdminLoginLink | null> {
    const [row] = await db.select().from(t).where(eq(t.id, id)).limit(1);
    return row ? toLink(row) : null;
  }

  async listActive(nowIso: string): Promise<AdminLoginLink[]> {
    const rows = await db
      .select()
      .from(t)
      .where(and(isNull(t.usedAt), isNull(t.revokedAt), gt(t.expiresAt, nowIso)))
      .orderBy(asc(t.expiresAt));
    return rows.map(toLink);
  }

  async revoke(id: string, nowIso: string): Promise<boolean> {
    const res = await db
      .update(t)
      .set({ revokedAt: nowIso })
      .where(and(eq(t.id, id), isNull(t.usedAt), isNull(t.revokedAt)))
      .returning({ id: t.id });
    return res.length === 1;
  }

  async consume(id: string, userId: string, nowIso: string): Promise<boolean> {
    const res = await db
      .update(t)
      .set({ usedAt: nowIso, usedByUserId: userId })
      .where(
        and(
          eq(t.id, id),
          isNull(t.usedAt),
          isNull(t.revokedAt),
          gt(t.expiresAt, nowIso),
        ),
      )
      .returning({ id: t.id });
    return res.length === 1;
  }
}
