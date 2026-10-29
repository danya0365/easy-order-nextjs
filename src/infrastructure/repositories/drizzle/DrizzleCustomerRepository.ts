import "server-only";

import { and, count, desc, eq, gte, like, lt, or } from "drizzle-orm";
import {
  HOUR_MS,
  effectiveMemberPolicy,
} from "@/src/domain/services/member-policy";
import { db, schema } from "@/src/infrastructure/db/client";
import type { Customer } from "@/src/domain/entities";
import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { Page, PageOpts } from "@/src/application/repositories/pagination";
import { decodeCursor } from "@/src/application/repositories/pagination";
import { cursorWhere, toPage } from "./_cursor";

type Row = typeof schema.customers.$inferSelect;

const STATUSES = new Set(["none", "pending", "approved", "rejected", "expired"]);

export function parseTags(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function toCustomer(r: Row): Customer {
  const status = STATUSES.has(r.onlineOrderStatus)
    ? (r.onlineOrderStatus as Customer["onlineOrderStatus"])
    : "none";
  return {
    id: r.id,
    shopId: r.shopId,
    phone: r.phone,
    displayName: r.displayName,
    publicCode: r.publicCode,
    onlineOrderStatus: status,
    onlineOrderRequestedAt: r.onlineOrderRequestedAt ?? null,
    onlineOrderReviewedAt: r.onlineOrderReviewedAt ?? null,
    onlineOrderReviewedBy: r.onlineOrderReviewedBy ?? null,
    onlineOrderRejectedAt: r.onlineOrderRejectedAt ?? null,
    note: r.note ?? null,
    tags: parseTags(r.tags),
    blockedAt: r.blockedAt ?? null,
    blockedBy: r.blockedBy ?? null,
    newMemberClearedAt: r.newMemberClearedAt ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleCustomerRepository implements ICustomerRepository {
  async findById(shopId: string, id: string): Promise<Customer | null> {
    const r = await db.query.customers.findFirst({
      where: and(
        eq(schema.customers.shopId, shopId),
        eq(schema.customers.id, id),
      ),
    });
    return r ? toCustomer(r) : null;
  }

  async findByPhone(shopId: string, phone: string): Promise<Customer | null> {
    const r = await db.query.customers.findFirst({
      where: and(
        eq(schema.customers.shopId, shopId),
        eq(schema.customers.phone, phone),
      ),
    });
    return r ? toCustomer(r) : null;
  }

  async anonymize(id: string): Promise<void> {
    await db
      .update(schema.customers)
      .set({
        phone: `erased:${id}`,
        displayName: "(ลบข้อมูลแล้ว)",
        publicCode: `erased:${id}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.customers.id, id));
  }

  async findByPublicCode(
    shopId: string,
    code: string,
  ): Promise<Customer | null> {
    const r = await db.query.customers.findFirst({
      where: and(
        eq(schema.customers.shopId, shopId),
        eq(schema.customers.publicCode, code),
      ),
    });
    return r ? toCustomer(r) : null;
  }

  async findOrCreate(
    shopId: string,
    phone: string,
    displayName?: string | null,
  ): Promise<Customer> {
    const existing = await this.findByPhone(shopId, phone);
    if (existing) {
      if (!existing.displayName && displayName) {
        const [r] = await db
          .update(schema.customers)
          .set({ displayName, updatedAt: new Date().toISOString() })
          .where(eq(schema.customers.id, existing.id))
          .returning();
        return toCustomer(r);
      }
      return existing;
    }
    const [r] = await db
      .insert(schema.customers)
      .values({ shopId, phone, displayName: displayName ?? null })
      .returning();
    return toCustomer(r);
  }

  async listByShop(shopId: string, search?: string): Promise<Customer[]> {
    const term = search?.trim();
    const where = term
      ? and(
          eq(schema.customers.shopId, shopId),
          or(
            like(schema.customers.phone, `%${term}%`),
            like(schema.customers.displayName, `%${term}%`),
          ),
        )
      : eq(schema.customers.shopId, shopId);
    const rows = await db.query.customers.findMany({
      where,
      orderBy: desc(schema.customers.createdAt),
      limit: 200,
    });
    return rows.map(toCustomer);
  }

  async pageByShop(
    shopId: string,
    opts: PageOpts & { search?: string } = {},
  ): Promise<Page<Customer>> {
    const limit = opts.limit ?? 30;
    const cur = decodeCursor(opts.cursor);
    const term = opts.search?.trim();
    const search = term
      ? or(
          like(schema.customers.phone, `%${term}%`),
          like(schema.customers.displayName, `%${term}%`),
        )
      : undefined;
    const rows = await db.query.customers.findMany({
      where: and(
        eq(schema.customers.shopId, shopId),
        search,
        cursorWhere(schema.customers.createdAt, schema.customers.id, cur),
      ),
      orderBy: [desc(schema.customers.createdAt), desc(schema.customers.id)],
      limit: limit + 1,
    });
    return toPage(rows.map(toCustomer), limit);
  }

  async listPendingOnlineOrder(shopId: string): Promise<Customer[]> {
    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.id, shopId),
      columns: { memberPendingExpiryHours: true },
    });
    const ttlMs =
      effectiveMemberPolicy({
        pendingExpiryHours: shop?.memberPendingExpiryHours ?? null,
      }).pendingExpiryHours * HOUR_MS;
    const cutoff = new Date(Date.now() - ttlMs).toISOString();
    await this.expireStalePending(shopId, cutoff);
    const rows = await db.query.customers.findMany({
      where: and(
        eq(schema.customers.shopId, shopId),
        eq(schema.customers.onlineOrderStatus, "pending"),
      ),
      orderBy: [
        desc(schema.customers.onlineOrderRequestedAt),
        desc(schema.customers.createdAt),
      ],
    });
    return rows.map(toCustomer);
  }

  async expireStalePending(shopId: string, cutoffIso: string): Promise<number> {
    const rows = await db
      .update(schema.customers)
      .set({ onlineOrderStatus: "expired" })
      .where(
        and(
          eq(schema.customers.shopId, shopId),
          eq(schema.customers.onlineOrderStatus, "pending"),
          lt(schema.customers.onlineOrderRequestedAt, cutoffIso),
        ),
      )
      .returning({ id: schema.customers.id });
    return rows.length;
  }

  async countOpenPending(shopId: string, cutoffIso: string): Promise<number> {
    const [c] = await db
      .select({ value: count() })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.shopId, shopId),
          eq(schema.customers.onlineOrderStatus, "pending"),
          gte(schema.customers.onlineOrderRequestedAt, cutoffIso),
        ),
      );
    return c?.value ?? 0;
  }

  async requestOnlineOrderMembership(
    shopId: string,
    customerId: string,
    nowIso: string,
  ): Promise<Customer | null> {
    const [r] = await db
      .update(schema.customers)
      .set({
        onlineOrderStatus: "pending",
        onlineOrderRequestedAt: nowIso,
        onlineOrderReviewedAt: null,
        onlineOrderReviewedBy: null,
        updatedAt: nowIso,
      })
      .where(
        and(
          eq(schema.customers.shopId, shopId),
          eq(schema.customers.id, customerId),
        ),
      )
      .returning();
    return r ? toCustomer(r) : null;
  }

  async setOnlineOrderStatus(
    shopId: string,
    customerId: string,
    status: "approved" | "rejected",
    reviewedBy: string,
    nowIso: string,
  ): Promise<Customer | null> {
    const [r] = await db
      .update(schema.customers)
      .set({
        onlineOrderStatus: status,
        ...(status === "rejected" ? { onlineOrderRejectedAt: nowIso } : {}),
        onlineOrderReviewedAt: nowIso,
        onlineOrderReviewedBy: reviewedBy,
        updatedAt: nowIso,
      })
      .where(
        and(
          eq(schema.customers.shopId, shopId),
          eq(schema.customers.id, customerId),
        ),
      )
      .returning();
    return r ? toCustomer(r) : null;
  }
}
