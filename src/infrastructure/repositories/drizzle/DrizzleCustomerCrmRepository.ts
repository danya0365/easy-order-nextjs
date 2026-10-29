import "server-only";

import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { CustomerDetailStats, ICustomerCrmRepository } from "@/src/application/repositories/ICustomerCrmRepository";
import type { CrmCustomerRow } from "@/src/domain/services/customer-crm";
import { parseTags } from "./DrizzleCustomerRepository";

const c = schema.customers;
const o = schema.orders;
const b = schema.loyaltyPointsBalances;
const oi = schema.orderItems;
const tx = schema.loyaltyPointsTransactions;
const al = schema.auditLogs;
const live = sql`${o.status} <> 'cancelled'`;

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

  async detailStats(shopId: string, customerId: string): Promise<CustomerDetailStats> {
    const scope = and(eq(o.shopId, shopId), eq(o.customerId, customerId), live);
    const [[agg], split, top] = await Promise.all([
      db
        .select({
          n: sql<number>`count(*)`,
          spend: sql<number>`coalesce(sum(${o.totalSatang}), 0)`,
          first: sql<string | null>`min(${o.createdAt})`,
          last: sql<string | null>`max(${o.createdAt})`,
        })
        .from(o)
        .where(scope),
      db.select({ f: o.fulfillmentType, n: sql<number>`count(*)` }).from(o).where(scope).groupBy(o.fulfillmentType),
      db
        .select({ name: oi.nameSnapshot, q: sql<number>`sum(${oi.quantity})` })
        .from(oi)
        .innerJoin(o, eq(oi.orderId, o.id))
        .where(and(eq(oi.shopId, shopId), scope))
        .groupBy(oi.nameSnapshot)
        .orderBy(desc(sql`sum(${oi.quantity})`))
        .limit(3),
    ]);
    const n = Number(agg?.n ?? 0);
    const spend = Number(agg?.spend ?? 0);
    const fulfillment = { pickup: 0, delivery: 0, dine_in: 0 };
    for (const r of split) if (r.f in fulfillment) fulfillment[r.f as keyof typeof fulfillment] = Number(r.n);
    return {
      orderCount: n,
      totalSpendSatang: spend,
      avgTicketSatang: n ? Math.round(spend / n) : 0,
      firstOrderAt: agg?.first ?? null,
      lastOrderAt: agg?.last ?? null,
      fulfillment,
      topItems: top.map((t) => ({ name: t.name, quantity: Number(t.q) })),
    };
  }

  async pageOrders(shopId: string, customerId: string, page: number, size: number) {
    const scope = and(eq(o.shopId, shopId), eq(o.customerId, customerId));
    const p = Math.max(1, Math.floor(page) || 1);
    const [items, [cnt]] = await Promise.all([
      db
        .select({
          id: o.id,
          orderNo: o.orderNo,
          createdAt: o.createdAt,
          status: o.status,
          paymentStatus: o.paymentStatus,
          fulfillmentType: o.fulfillmentType,
          totalSatang: o.totalSatang,
        })
        .from(o)
        .where(scope)
        .orderBy(desc(o.createdAt))
        .limit(size)
        .offset((p - 1) * size),
      db.select({ n: sql<number>`count(*)` }).from(o).where(scope),
    ]);
    return { items, total: Number(cnt?.n ?? 0) };
  }

  async deliveryAddresses(shopId: string, customerId: string, limit = 5) {
    const rows = await db
      .select({ address: o.deliveryAddress, last: sql<string>`max(${o.createdAt})`, n: sql<number>`count(*)` })
      .from(o)
      .where(and(eq(o.shopId, shopId), eq(o.customerId, customerId), isNotNull(o.deliveryAddress)))
      .groupBy(o.deliveryAddress)
      .orderBy(desc(sql`max(${o.createdAt})`))
      .limit(limit);
    return rows
      .filter((r) => r.address?.trim())
      .map((r) => ({ address: r.address!, lastUsedAt: r.last, count: Number(r.n) }));
  }

  async ledger(shopId: string, customerId: string, limit = 50) {
    return db
      .select({ id: tx.id, type: tx.type, quantity: tx.quantity, note: tx.note, orderId: tx.orderId, createdAt: tx.createdAt })
      .from(tx)
      .where(and(eq(tx.shopId, shopId), eq(tx.customerId, customerId)))
      .orderBy(desc(tx.createdAt))
      .limit(limit);
  }

  async adjustBalance(shopId: string, customerId: string, delta: number) {
    await db.insert(b).values({ shopId, customerId }).onConflictDoNothing();
    const r = await db
      .update(b)
      .set({ currentPoints: sql`${b.currentPoints} + ${delta}`, updatedAt: new Date().toISOString() })
      .where(and(eq(b.shopId, shopId), eq(b.customerId, customerId), sql`${b.currentPoints} + ${delta} >= 0`))
      .returning({ p: b.currentPoints });
    return r.length ? Number(r[0].p) : null;
  }

  async timeline(shopId: string, customerId: string, limit = 50) {
    return db
      .select({ id: al.id, action: al.action, actorUserId: al.actorUserId, metadata: al.metadata, createdAt: al.createdAt })
      .from(al)
      .where(and(eq(al.shopId, shopId), eq(al.targetType, "customer"), eq(al.targetId, customerId)))
      .orderBy(desc(al.createdAt))
      .limit(limit);
  }
}
