import "server-only";

import { and, asc, eq, gt } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type {
  CreateKioskSessionInput,
  IKioskSessionRepository,
  KioskSession,
} from "@/src/application/repositories/IKioskSessionRepository";

type Row = typeof schema.kioskSessions.$inferSelect;

function toSession(r: Row): KioskSession {
  return {
    id: r.id,
    shopId: r.shopId,
    label: r.label,
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
  };
}

export class DrizzleKioskSessionRepository implements IKioskSessionRepository {
  async create(input: CreateKioskSessionInput): Promise<KioskSession> {
    const [r] = await db
      .insert(schema.kioskSessions)
      .values({
        shopId: input.shopId,
        label: input.label ?? null,
        expiresAt: input.expiresAt,
      })
      .returning();
    return toSession(r);
  }

  async findValid(id: string, now: Date): Promise<KioskSession | null> {
    const r = await db.query.kioskSessions.findFirst({
      where: and(
        eq(schema.kioskSessions.id, id),
        gt(schema.kioskSessions.expiresAt, now.toISOString()),
      ),
    });
    return r ? toSession(r) : null;
  }

  async delete(id: string): Promise<void> {
    await db.delete(schema.kioskSessions).where(eq(schema.kioskSessions.id, id));
  }

  async deleteAllForShop(shopId: string): Promise<void> {
    await db
      .delete(schema.kioskSessions)
      .where(eq(schema.kioskSessions.shopId, shopId));
  }

  async listByShop(shopId: string): Promise<KioskSession[]> {
    const rows = await db.query.kioskSessions.findMany({
      where: eq(schema.kioskSessions.shopId, shopId),
      orderBy: asc(schema.kioskSessions.createdAt),
    });
    return rows.map(toSession);
  }
}
