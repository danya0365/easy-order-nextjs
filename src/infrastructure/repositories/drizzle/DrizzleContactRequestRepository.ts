import "server-only";

import { and, asc, desc, eq, count } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { ContactRequest, ContactRequestStatus } from "@/src/domain/entities";
import type {
  CreateContactRequestInput,
  IContactRequestRepository,
} from "@/src/application/repositories/IContactRequestRepository";
import type { Page, PageOpts } from "@/src/application/repositories/pagination";
import { decodeCursor } from "@/src/application/repositories/pagination";
import { cursorWhere, toPage } from "./_cursor";

type Row = typeof schema.contactRequests.$inferSelect;

function toContactRequest(r: Row): ContactRequest {
  return {
    id: r.id,
    shopId: r.shopId,
    createdBy: r.createdBy,
    email: r.email,
    source: r.source,
    ipAddress: r.ipAddress,
    subject: r.subject,
    message: r.message,
    contactChannel: r.contactChannel,
    status: r.status,
    resolvedBy: r.resolvedBy,
    resolvedAt: r.resolvedAt,
    createdAt: r.createdAt,
  };
}

export class DrizzleContactRequestRepository
  implements IContactRequestRepository
{
  async create(input: CreateContactRequestInput): Promise<ContactRequest> {
    const [r] = await db
      .insert(schema.contactRequests)
      .values({
        shopId: input.shopId ?? null,
        createdBy: input.createdBy ?? null,
        email: input.email ?? null,
        source: input.source ?? "operator",
        ipAddress: input.ipAddress ?? null,
        subject: input.subject,
        message: input.message,
        contactChannel: input.contactChannel,
      })
      .returning();
    return toContactRequest(r);
  }

  async listRecent(limit = 50): Promise<ContactRequest[]> {
    const rows = await db.query.contactRequests.findMany({
      // open before resolved, then newest first.
      orderBy: [
        asc(schema.contactRequests.status),
        desc(schema.contactRequests.createdAt),
      ],
      limit,
    });
    return rows.map(toContactRequest);
  }

  async listOpen(): Promise<ContactRequest[]> {
    const rows = await db.query.contactRequests.findMany({
      where: eq(schema.contactRequests.status, "open"),
      orderBy: desc(schema.contactRequests.createdAt),
    });
    return rows.map(toContactRequest);
  }

  async pageResolved(opts: PageOpts = {}): Promise<Page<ContactRequest>> {
    const limit = opts.limit ?? 20;
    const cur = decodeCursor(opts.cursor);
    const rows = await db.query.contactRequests.findMany({
      where: and(
        eq(schema.contactRequests.status, "resolved"),
        cursorWhere(
          schema.contactRequests.createdAt,
          schema.contactRequests.id,
          cur,
        ),
      ),
      orderBy: [
        desc(schema.contactRequests.createdAt),
        desc(schema.contactRequests.id),
      ],
      limit: limit + 1,
    });
    return toPage(rows.map(toContactRequest), limit);
  }

  async listByShop(shopId: string, limit = 20): Promise<ContactRequest[]> {
    const rows = await db.query.contactRequests.findMany({
      where: eq(schema.contactRequests.shopId, shopId),
      orderBy: desc(schema.contactRequests.createdAt),
      limit,
    });
    return rows.map(toContactRequest);
  }

  async findLatestByShop(shopId: string): Promise<ContactRequest | null> {
    const row = await db.query.contactRequests.findFirst({
      where: eq(schema.contactRequests.shopId, shopId),
      orderBy: desc(schema.contactRequests.createdAt),
    });
    return row ? toContactRequest(row) : null;
  }

  async countByStatus(status: ContactRequestStatus): Promise<number> {
    const [r] = await db
      .select({ value: count() })
      .from(schema.contactRequests)
      .where(eq(schema.contactRequests.status, status));
    return r?.value ?? 0;
  }

  async resolve(id: string, resolvedBy: string): Promise<ContactRequest | null> {
    const [row] = await db
      .update(schema.contactRequests)
      .set({ status: "resolved", resolvedBy, resolvedAt: new Date().toISOString() })
      .where(eq(schema.contactRequests.id, id))
      .returning();
    return row ? toContactRequest(row) : null;
  }
}
