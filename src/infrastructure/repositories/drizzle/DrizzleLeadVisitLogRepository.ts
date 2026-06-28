import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { LeadVisitLog } from "@/src/domain/entities";
import type {
  CreateLeadVisitLogInput,
  ILeadVisitLogRepository,
} from "@/src/application/repositories/ILeadVisitLogRepository";
import type { Page, PageOpts } from "@/src/application/repositories/pagination";
import { decodeCursor } from "@/src/application/repositories/pagination";
import { cursorWhere, toPage } from "./_cursor";

type Row = typeof schema.leadVisitLogs.$inferSelect;

function toLog(r: Row): LeadVisitLog {
  return {
    id: r.id,
    leadId: r.leadId,
    reaction: r.reaction,
    statusBefore: r.statusBefore,
    statusAfter: r.statusAfter,
    note: r.note,
    performedBy: r.performedBy,
    createdAt: r.createdAt,
  };
}

export class DrizzleLeadVisitLogRepository implements ILeadVisitLogRepository {
  async create(input: CreateLeadVisitLogInput): Promise<LeadVisitLog> {
    const [r] = await db
      .insert(schema.leadVisitLogs)
      .values({
        leadId: input.leadId,
        reaction: input.reaction,
        statusBefore: input.statusBefore ?? null,
        statusAfter: input.statusAfter ?? null,
        note: input.note ?? null,
        performedBy: input.performedBy,
      })
      .returning();
    return toLog(r);
  }

  async listByLead(leadId: string, limit = 20): Promise<LeadVisitLog[]> {
    const rows = await db.query.leadVisitLogs.findMany({
      where: eq(schema.leadVisitLogs.leadId, leadId),
      orderBy: desc(schema.leadVisitLogs.createdAt),
      limit,
    });
    return rows.map(toLog);
  }

  async pageByLead(
    leadId: string,
    opts: PageOpts = {},
  ): Promise<Page<LeadVisitLog>> {
    const limit = opts.limit ?? 20;
    const cur = decodeCursor(opts.cursor);
    const rows = await db.query.leadVisitLogs.findMany({
      where: and(
        eq(schema.leadVisitLogs.leadId, leadId),
        cursorWhere(
          schema.leadVisitLogs.createdAt,
          schema.leadVisitLogs.id,
          cur,
        ),
      ),
      orderBy: [
        desc(schema.leadVisitLogs.createdAt),
        desc(schema.leadVisitLogs.id),
      ],
      limit: limit + 1,
    });
    return toPage(rows.map(toLog), limit);
  }
}
