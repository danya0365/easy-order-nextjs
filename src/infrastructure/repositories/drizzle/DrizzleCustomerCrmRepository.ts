import "server-only";

import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { ICustomerCrmRepository } from "@/src/application/repositories/ICustomerCrmRepository";
import type { CrmCustomerRow } from "@/src/domain/services/customer-crm";
import { parseTags } from "./DrizzleCustomerRepository";

const c = schema.customers;
const o = schema.orders;
const b = schema.loyaltyPointsBalances;

export class DrizzleCustomerCrmRepository implements ICustomerCrmRepository {
  async listWithStats(shopId: string): Promise<CrmCustomerRow[]> {
    const agg = db
      .select({
        customerId: o.customerId,
        orderCount: sql<number>`count(*)`.as("order_count"),
        spend: sql<number>`coalesce(sum(${o.totalSatang}), 0)`.as("spend"),
        lastAt: sql<string | null>`max(${o.createdAt})`.as("last_at"),
      })
      .from(o)
      .where(and(eq(o.shopId, shopId), isNotNull(o.customerId), sql`${o.status} <> 'cancelled'`))
      .groupBy(o.customerId)
      .as("agg");
    const rows = await db
      .select({
        id: c.id,
        phone: c.phone,
        displayName: c.displayName,
        publicCode: c.publicCode,
        onlineOrderStatus: c.onlineOrderStatus,
        onlineOrderRequestedAt: c.onlineOrderRequestedAt,
        tags: c.tags,
        note: c.note,
        blockedAt: c.blockedAt,
        newMemberClearedAt: c.newMemberClearedAt,
        createdAt: c.createdAt,
        orderCount: agg.orderCount,
        spend: agg.spend,
        lastAt: agg.lastAt,
        points: b.currentPoints,
      })
      .from(c)
      .leftJoin(agg, eq(agg.customerId, c.id))
      .leftJoin(b, and(eq(b.customerId, c.id), eq(b.shopId, shopId)))
      .where(eq(c.shopId, shopId));
    return rows.map((r) => ({
      id: r.id,
      phone: r.phone,
      displayName: r.displayName,
      publicCode: r.publicCode,
      onlineOrderStatus: r.onlineOrderStatus,
      onlineOrderRequestedAt: r.onlineOrderRequestedAt ?? null,
      tags: parseTags(r.tags),
      note: r.note ?? null,
      blockedAt: r.blockedAt ?? null,
      newMemberClearedAt: r.newMemberClearedAt ?? null,
      createdAt: r.createdAt,
      orderCount: Number(r.orderCount ?? 0),
      totalSpendSatang: Number(r.spend ?? 0),
      lastOrderAt: r.lastAt ?? null,
      points: Number(r.points ?? 0),
    }));
  }

  async filterOwnIds(shopId: string, ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await db
      .select({ id: c.id })
      .from(c)
      .where(and(eq(c.shopId, shopId), inArray(c.id, ids.slice(0, 500))));
    return rows.map((r) => r.id);
  }

  private async upd(shopId: string, id: string, set: Partial<typeof c.$inferInsert>) {
    const r = await db
      .update(c)
      .set({ ...set, updatedAt: new Date().toISOString() })
      .where(and(eq(c.shopId, shopId), eq(c.id, id)))
      .returning({ id: c.id });
    return r.length > 0;
  }

  updateProfile(shopId: string, id: string, input: { displayName?: string | null; note?: string | null }) {
    const set: Partial<typeof c.$inferInsert> = {};
    if (input.displayName !== undefined) set.displayName = input.displayName;
    if (input.note !== undefined) set.note = input.note;
    return this.upd(shopId, id, set);
  }

  setTags(shopId: string, id: string, tags: string[]) {
    return this.upd(shopId, id, { tags: JSON.stringify(tags) });
  }

  setBlocked(shopId: string, id: string, by: string | null) {
    return this.upd(shopId, id, by ? { blockedAt: new Date().toISOString(), blockedBy: by } : { blockedAt: null, blockedBy: null });
  }

  setNewMemberCleared(shopId: string, id: string, at: string | null) {
    return this.upd(shopId, id, { newMemberClearedAt: at });
  }

  async notesFor(shopId: string, customerIds: string[]) {
    const m = new Map<string, string>();
    const ids = [...new Set(customerIds)].filter(Boolean);
    if (ids.length === 0) return m;
    const rows = await db
      .select({ id: c.id, note: c.note })
      .from(c)
      .where(and(eq(c.shopId, shopId), inArray(c.id, ids), isNotNull(c.note)));
    for (const r of rows) if (r.note?.trim()) m.set(r.id, r.note.trim());
    return m;
  }
}
