import "server-only";

import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { CustomerDetailStats, ICustomerCrmRepository } from "@/src/application/repositories/ICustomerCrmRepository";
import {
  LAPSED_DAYS,
  monthStartBangkok,
  normalizeQuery,
  type CrmCustomerRow,
  type CrmQuery,
  type CrmSort,
  type CrmTab,
  type CrmOverview,
} from "@/src/domain/services/customer-crm";
import type { SQL } from "drizzle-orm";
import { parseTags } from "./DrizzleCustomerRepository";

const c = schema.customers;
const o = schema.orders;
const b = schema.loyaltyPointsBalances;
const oi = schema.orderItems;
const tx = schema.loyaltyPointsTransactions;
const al = schema.auditLogs;
const live = sql`${o.status} <> 'cancelled'`;

/* ---------- SQL list (search / filter / sort / paginate in the DB) ---------- */

type RawRow = {
  id: string;
  phone: string;
  display_name: string | null;
  public_code: string;
  online_order_status: string;
  online_order_requested_at: string | null;
  tags: string | null;
  note: string | null;
  blocked_at: string | null;
  new_member_cleared_at: string | null;
  created_at: string;
  n: number | null;
  spend: number | null;
  last_at: string | null;
  points: number | null;
};

const SELECT_COLS = sql.raw(`c.id, c.phone, c.display_name, c.public_code, c.online_order_status,
  c.online_order_requested_at, c.tags, c.note, c.blocked_at, c.new_member_cleared_at, c.created_at,
  coalesce(a.n, 0) as n, coalesce(a.spend, 0) as spend, a.last_at, coalesce(b.current_points, 0) as points`);

/** customers c + per-customer live-order aggregate a + points b, scoped to one shop. */
function fromShop(shopId: string): SQL {
  return sql`from customers c
    left join (
      select customer_id, count(*) as n, coalesce(sum(total_satang), 0) as spend, max(created_at) as last_at
      from orders
      where shop_id = ${shopId} and customer_id is not null and status <> 'cancelled'
      group by customer_id
    ) a on a.customer_id = c.id
    left join loyalty_points_balances b on b.customer_id = c.id and b.shop_id = ${shopId}
    where c.shop_id = ${shopId}`;
}

const lapsedCutoff = (now: number) => new Date(now - LAPSED_DAYS * 86_400_000).toISOString();

function tabCond(tab: CrmTab, now: number): SQL {
  switch (tab) {
    case "all":
      return sql`1 = 1`;
    case "blocked":
      return sql`c.blocked_at is not null`;
    case "pending":
      return sql`(c.blocked_at is null and c.online_order_status = 'pending')`;
    case "vip":
      return sql`(c.blocked_at is null and exists (select 1 from json_each(c.tags) where value = 'vip'))`;
    case "lapsed":
      return sql`(c.blocked_at is null and c.online_order_status <> 'pending' and a.last_at is not null and a.last_at < ${lapsedCutoff(now)})`;
    case "active":
      return sql`(c.blocked_at is null and c.online_order_status not in ('pending', 'rejected'))`;
  }
}

const likeEscape = (v: string) => v.replace(/[\\%_]/g, (m) => `\\${m}`);

function filterCond(q: ReturnType<typeof normalizeQuery>, now: number): SQL {
  const parts: SQL[] = [tabCond(q.tab, now)];
  if (q.channel === "static") parts.push(sql`(c.online_order_requested_at is not null or c.online_order_status <> 'none')`);
  if (q.channel === "instore") parts.push(sql`(c.online_order_requested_at is null and c.online_order_status = 'none')`);
  if (q.q) {
    const needle = `%${likeEscape(q.q.toLowerCase())}%`;
    const digits = q.q.replace(/\D/g, "");
    const or: SQL[] = [
      sql`lower(coalesce(c.display_name, '')) like ${needle} escape '\\'`,
      sql`lower(c.public_code) = ${q.q.toLowerCase()}`,
    ];
    if (digits.length >= 3) or.push(sql`c.phone like ${`%${digits}%`}`);
    parts.push(sql`(${sql.join(or, sql` or `)})`);
  }
  return sql.join(parts, sql` and `);
}

const ORDER_BY: Record<CrmSort, SQL> = {
  recent: sql.raw("c.created_at desc, c.id"),
  spend: sql.raw("spend desc, c.created_at desc, c.id"),
  orders: sql.raw("n desc, c.created_at desc, c.id"),
  lastOrder: sql.raw("a.last_at is null, a.last_at desc, c.id"),
  points: sql.raw("points desc, c.created_at desc, c.id"),
};

function toRow(r: RawRow): CrmCustomerRow {
  return {
    id: r.id,
    phone: r.phone,
    displayName: r.display_name,
    publicCode: r.public_code,
    onlineOrderStatus: r.online_order_status,
    onlineOrderRequestedAt: r.online_order_requested_at ?? null,
    tags: parseTags(r.tags ?? "[]"),
    note: r.note ?? null,
    blockedAt: r.blocked_at ?? null,
    newMemberClearedAt: r.new_member_cleared_at ?? null,
    createdAt: r.created_at,
    orderCount: Number(r.n ?? 0),
    totalSpendSatang: Number(r.spend ?? 0),
    lastOrderAt: r.last_at ?? null,
    points: Number(r.points ?? 0),
  };
}

export class DrizzleCustomerCrmRepository implements ICustomerCrmRepository {
  async searchPage(shopId: string, query: CrmQuery, opts: { page: number; size: number; now?: number }) {
    const q = normalizeQuery(query);
    const now = opts.now ?? Date.now();
    const size = Math.min(100, Math.max(1, Math.floor(opts.size) || 25));
    const page = Math.max(1, Math.floor(opts.page) || 1);
    const where = filterCond(q, now);
    const [rows, cnt] = await Promise.all([
      db.all<RawRow>(sql`select ${SELECT_COLS} ${fromShop(shopId)} and ${where} order by ${ORDER_BY[q.sort]} limit ${size} offset ${(page - 1) * size}`),
      db.all<{ n: number }>(sql`select count(*) as n ${fromShop(shopId)} and ${where}`),
    ]);
    return { items: rows.map(toRow), total: Number(cnt[0]?.n ?? 0), page, size };
  }

  async matchingIds(shopId: string, query: CrmQuery, cap: number, now = Date.now()) {
    const q = normalizeQuery(query);
    const where = filterCond(q, now);
    const rows = await db.all<{ id: string }>(
      sql`select c.id ${fromShop(shopId)} and ${where} order by ${ORDER_BY[q.sort]} limit ${cap + 1}`,
    );
    return { ids: rows.slice(0, cap).map((r) => r.id), overCap: rows.length > cap };
  }

  async exportRows(shopId: string, query: CrmQuery, opts: { ids?: string[]; cap: number; now?: number }) {
    const q = normalizeQuery(query);
    const now = opts.now ?? Date.now();
    let where = filterCond(q, now);
    if (opts.ids) {
      if (opts.ids.length === 0) return { rows: [], overCap: false };
      where = sql`${where} and c.id in (${sql.join(opts.ids.map((i) => sql`${i}`), sql`, `)})`;
    }
    const rows = await db.all<RawRow>(
      sql`select ${SELECT_COLS} ${fromShop(shopId)} and ${where} order by ${ORDER_BY[q.sort]} limit ${opts.cap + 1}`,
    );
    return { rows: rows.slice(0, opts.cap).map(toRow), overCap: rows.length > opts.cap };
  }

  async overview(shopId: string, now = Date.now()): Promise<CrmOverview> {
    const cnt = (cond: SQL) => sql`coalesce(sum(case when ${cond} then 1 else 0 end), 0)`;
    const [r] = await db.all<Record<string, number>>(sql`select
        count(*) as total,
        ${cnt(sql`c.created_at >= ${monthStartBangkok(now)}`)} as new_month,
        coalesce(sum(case when coalesce(b.current_points, 0) > 0 then b.current_points else 0 end), 0) as points,
        ${cnt(tabCond("active", now))} as t_active,
        ${cnt(tabCond("pending", now))} as t_pending,
        ${cnt(tabCond("vip", now))} as t_vip,
        ${cnt(tabCond("lapsed", now))} as t_lapsed,
        ${cnt(tabCond("blocked", now))} as t_blocked
      ${fromShop(shopId)}`);
    const n = (k: string) => Number(r?.[k] ?? 0);
    return {
      summary: {
        total: n("total"),
        newThisMonth: n("new_month"),
        pending: n("t_pending"),
        lapsed: n("t_lapsed"),
        outstandingPoints: n("points"),
      },
      tabs: {
        active: n("t_active"),
        pending: n("t_pending"),
        vip: n("t_vip"),
        lapsed: n("t_lapsed"),
        blocked: n("t_blocked"),
        all: n("total"),
      },
    };
  }

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
