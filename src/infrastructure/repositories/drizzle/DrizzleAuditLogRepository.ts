import "server-only";

import { and, desc, eq, gte, count } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { AuditLog } from "@/src/domain/entities";
import type { Role } from "@/src/domain/types/roles";
import type {
  CreateAuditLogInput,
  AuditLogFilter,
  CountRecentOpts,
  IAuditLogRepository,
} from "@/src/application/repositories/IAuditLogRepository";
import type { Page, PageOpts } from "@/src/application/repositories/pagination";
import { decodeCursor } from "@/src/application/repositories/pagination";
import { cursorWhere, toPage } from "./_cursor";

type Row = typeof schema.auditLogs.$inferSelect;

function toAuditLog(r: Row): AuditLog {
  return {
    id: r.id,
    actorUserId: r.actorUserId,
    actorRole: (r.actorRole as Role | null) ?? null,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    shopId: r.shopId,
    ip: r.ip,
    userAgent: r.userAgent,
    metadata: r.metadata,
    createdAt: r.createdAt,
  };
}

export class DrizzleAuditLogRepository implements IAuditLogRepository {
  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const [r] = await db
      .insert(schema.auditLogs)
      .values({
        actorUserId: input.actorUserId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        shopId: input.shopId ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      })
      .returning();
    return toAuditLog(r);
  }

  async page(filter: AuditLogFilter, opts: PageOpts = {}): Promise<Page<AuditLog>> {
    const limit = opts.limit ?? 30;
    const cur = decodeCursor(opts.cursor);
    const conds = [
      filter.shopId ? eq(schema.auditLogs.shopId, filter.shopId) : undefined,
      filter.actorUserId
        ? eq(schema.auditLogs.actorUserId, filter.actorUserId)
        : undefined,
      filter.action ? eq(schema.auditLogs.action, filter.action) : undefined,
      cursorWhere(schema.auditLogs.createdAt, schema.auditLogs.id, cur),
    ].filter(Boolean);
    const rows = await db.query.auditLogs.findMany({
      where: and(...conds),
      orderBy: [desc(schema.auditLogs.createdAt), desc(schema.auditLogs.id)],
      limit: limit + 1,
    });
    return toPage(rows.map(toAuditLog), limit);
  }

  async pageByShop(shopId: string, opts: PageOpts = {}): Promise<Page<AuditLog>> {
    return this.page({ shopId }, opts);
  }

  async countRecent(
    action: string,
    sinceISO: string,
    opts: CountRecentOpts = {},
  ): Promise<number> {
    const [r] = await db
      .select({ value: count() })
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.action, action),
          gte(schema.auditLogs.createdAt, sinceISO),
          opts.actorUserId
            ? eq(schema.auditLogs.actorUserId, opts.actorUserId)
            : undefined,
          opts.ip ? eq(schema.auditLogs.ip, opts.ip) : undefined,
        ),
      );
    return r?.value ?? 0;
  }
}
