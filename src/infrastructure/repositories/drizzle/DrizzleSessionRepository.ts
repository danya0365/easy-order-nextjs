import "server-only";

import { and, desc, eq, gt, lt } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { Session, User } from "@/src/domain/entities";
import type {
  CreateSessionInput,
  ISessionRepository,
} from "@/src/application/repositories/ISessionRepository";

type SessionRow = typeof schema.sessions.$inferSelect;
type UserRow = typeof schema.users.$inferSelect;

function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.userId,
    expiresAt: row.expiresAt,
    userAgent: row.userAgent,
    ip: row.ip,
    createdAt: row.createdAt,
  };
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    shopId: row.shopId,
    branchId: row.branchId,
    isActive: row.isActive,
    lineUserId: row.lineUserId,
    totpEnabled: !!row.totpConfirmedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleSessionRepository implements ISessionRepository {
  async create(input: CreateSessionInput): Promise<Session> {
    const [row] = await db
      .insert(schema.sessions)
      .values({
        userId: input.userId,
        expiresAt: input.expiresAt,
        userAgent: input.userAgent ?? null,
        ip: input.ip ?? null,
      })
      .returning();
    return toSession(row);
  }

  async findValid(
    token: string,
    now: Date,
  ): Promise<{ session: Session; user: User } | null> {
    const [row] = await db
      .select({ session: schema.sessions, user: schema.users })
      .from(schema.sessions)
      .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
      .where(
        and(
          eq(schema.sessions.id, token),
          gt(schema.sessions.expiresAt, now.toISOString()),
        ),
      )
      .limit(1);
    if (!row || !row.user.isActive) return null;
    return { session: toSession(row.session), user: toUser(row.user) };
  }

  async delete(token: string): Promise<void> {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, token));
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  }

  async listByUser(userId: string, now: Date): Promise<Session[]> {
    const rows = await db.query.sessions.findMany({
      where: and(
        eq(schema.sessions.userId, userId),
        gt(schema.sessions.expiresAt, now.toISOString()),
      ),
      orderBy: desc(schema.sessions.createdAt),
    });
    return rows.map(toSession);
  }

  async deleteById(id: string, userId: string): Promise<void> {
    await db
      .delete(schema.sessions)
      .where(and(eq(schema.sessions.id, id), eq(schema.sessions.userId, userId)));
  }

  async deleteExpired(now: Date): Promise<number> {
    const res = await db
      .delete(schema.sessions)
      .where(lt(schema.sessions.expiresAt, now.toISOString()));
    return (res as { rowsAffected?: number }).rowsAffected ?? 0;
  }
}
