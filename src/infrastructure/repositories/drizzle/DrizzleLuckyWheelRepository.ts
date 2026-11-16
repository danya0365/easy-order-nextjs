import "server-only";

import { and, asc, count, desc, eq, gt, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { SpinCampaign, SpinPrize, SpinResult, SpinTicket } from "@/src/domain/entities";
import type {
  CreateSpinResultInput,
  GrantTicketInput,
  ILuckyWheelRepository,
  SpinPrizeInput,
  SpinReport,
  SpinResultFilter,
  UpdateSpinCampaignInput,
} from "@/src/application/repositories/ILuckyWheelRepository";

const C = schema.spinCampaigns;
const P = schema.spinPrizes;
const T = schema.spinTickets;
const R = schema.spinResults;

const toCampaign = (r: typeof C.$inferSelect): SpinCampaign => ({ ...r });
const toPrize = (r: typeof P.$inferSelect): SpinPrize => ({ ...r });
const toTicket = (r: typeof T.$inferSelect): SpinTicket => ({ ...r });
const toResult = (r: typeof R.$inferSelect): SpinResult => ({ ...r });

function prizeValues(input: SpinPrizeInput) {
  return {
    type: input.type,
    name: input.name,
    weight: input.weight,
    stock: input.stock,
    dailyCap: input.dailyCap,
    pointsAmount: input.pointsAmount,
    menuItemId: input.menuItemId,
    costSatang: input.costSatang,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  };
}

export class DrizzleLuckyWheelRepository implements ILuckyWheelRepository {
  async getCampaign(shopId: string): Promise<SpinCampaign | null> {
    const r = await db.query.spinCampaigns.findFirst({ where: eq(C.shopId, shopId) });
    return r ? toCampaign(r) : null;
  }

  async upsertCampaign(shopId: string, input: UpdateSpinCampaignInput): Promise<SpinCampaign> {
    await db.insert(C).values({ shopId }).onConflictDoNothing();
    if (Object.keys(input).length > 0) {
      await db.update(C).set({ ...input, updatedAt: new Date().toISOString() }).where(eq(C.shopId, shopId));
    }
    return (await this.getCampaign(shopId))!;
  }

  async listPrizes(shopId: string): Promise<SpinPrize[]> {
    const rows = await db.select().from(P).where(eq(P.shopId, shopId)).orderBy(asc(P.sortOrder), asc(P.createdAt));
    return rows.map(toPrize);
  }

  async findPrize(shopId: string, id: string): Promise<SpinPrize | null> {
    const r = await db.query.spinPrizes.findFirst({ where: and(eq(P.shopId, shopId), eq(P.id, id)) });
    return r ? toPrize(r) : null;
  }

  async createPrize(shopId: string, campaignId: string, input: SpinPrizeInput): Promise<SpinPrize> {
    const [r] = await db.insert(P).values({ shopId, campaignId, ...prizeValues(input) }).returning();
    return toPrize(r);
  }

  async updatePrize(shopId: string, id: string, input: SpinPrizeInput): Promise<SpinPrize> {
    const [r] = await db
      .update(P)
      .set({ ...prizeValues(input), updatedAt: new Date().toISOString() })
      .where(and(eq(P.shopId, shopId), eq(P.id, id)))
      .returning();
    if (!r) throw new Error("ไม่พบรางวัล");
    return toPrize(r);
  }

  async deletePrize(shopId: string, id: string): Promise<"deleted" | "deactivated"> {
    const [{ value }] = await db.select({ value: count() }).from(R).where(eq(R.prizeId, id));
    if (value > 0) {
      await db.update(P).set({ isActive: false, updatedAt: new Date().toISOString() }).where(and(eq(P.shopId, shopId), eq(P.id, id)));
      return "deactivated";
    }
    await db.delete(P).where(and(eq(P.shopId, shopId), eq(P.id, id)));
    return "deleted";
  }

  async takeStock(prizeId: string): Promise<boolean> {
    const p = await db.query.spinPrizes.findFirst({ where: eq(P.id, prizeId) });
    if (!p) return false;
    if (p.stock === null) return true;
    const res = await db
      .update(P)
      .set({ stock: sql`${P.stock} - 1` })
      .where(and(eq(P.id, prizeId), gt(P.stock, 0)))
      .returning({ id: P.id });
    return res.length === 1;
  }

  async winsOnDay(shopId: string, dayKey: string): Promise<Record<string, number>> {
    const rows = await db
      .select({ prizeId: R.prizeId, n: count() })
      .from(R)
      .where(and(eq(R.shopId, shopId), eq(R.dayKey, dayKey)))
      .groupBy(R.prizeId);
    const out: Record<string, number> = {};
    for (const r of rows) if (r.prizeId) out[r.prizeId] = r.n;
    return out;
  }

  async grantTicket(input: GrantTicketInput): Promise<SpinTicket | null> {
    const rows = await db
      .insert(T)
      .values({
        shopId: input.shopId,
        customerId: input.customerId,
        source: input.source,
        sourceKey: input.sourceKey,
        orderId: input.orderId ?? null,
        expiresAt: input.expiresAt ?? null,
      })
      .onConflictDoNothing()
      .returning();
    return rows[0] ? toTicket(rows[0]) : null;
  }

  async availableTickets(shopId: string, customerId: string, nowISO: string): Promise<SpinTicket[]> {
    const rows = await db
      .select()
      .from(T)
      .where(
        and(
          eq(T.shopId, shopId),
          eq(T.customerId, customerId),
          eq(T.status, "available"),
          or(isNull(T.expiresAt), gt(T.expiresAt, nowISO)),
        ),
      )
      .orderBy(asc(T.expiresAt), asc(T.createdAt));
    // Soonest-expiring first (nulls sort first in SQLite asc → move them last).
    const list = rows.map(toTicket);
    return [...list.filter((t) => t.expiresAt), ...list.filter((t) => !t.expiresAt)];
  }

  async useTicket(ticketId: string, nowISO: string): Promise<boolean> {
    const res = await db
      .update(T)
      .set({ status: "used", usedAt: nowISO })
      .where(and(eq(T.id, ticketId), eq(T.status, "available")))
      .returning({ id: T.id });
    return res.length === 1;
  }

  async revokeOrderTickets(shopId: string, orderId: string): Promise<number> {
    const res = await db
      .update(T)
      .set({ status: "revoked" })
      .where(and(eq(T.shopId, shopId), eq(T.orderId, orderId), eq(T.status, "available")))
      .returning({ id: T.id });
    return res.length;
  }

  async ticketsByOrder(shopId: string, orderId: string): Promise<SpinTicket[]> {
    const rows = await db.select().from(T).where(and(eq(T.shopId, shopId), eq(T.orderId, orderId)));
    return rows.map(toTicket);
  }

  async createResult(input: CreateSpinResultInput): Promise<SpinResult> {
    const [r] = await db.insert(R).values(input).returning();
    return toResult(r);
  }

  async findResult(shopId: string, id: string): Promise<SpinResult | null> {
    const r = await db.query.spinResults.findFirst({ where: and(eq(R.shopId, shopId), eq(R.id, id)) });
    return r ? toResult(r) : null;
  }

  async findResultByCode(shopId: string, code: string): Promise<SpinResult | null> {
    const r = await db.query.spinResults.findFirst({ where: and(eq(R.shopId, shopId), eq(R.rewardCode, code)) });
    return r ? toResult(r) : null;
  }

  async pageResults(
    shopId: string,
    filter: SpinResultFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: SpinResult[]; total: number }> {
    const conds = [eq(R.shopId, shopId)];
    if (filter.customerId) conds.push(eq(R.customerId, filter.customerId));
    if (filter.rewardsOnly) conds.push(inArray(R.rewardStatus, ["pending", "redeemed"]));
    if (filter.rewardStatus) conds.push(eq(R.rewardStatus, filter.rewardStatus));
    const where = and(...conds);
    const [rows, [{ value }]] = await Promise.all([
      db
        .select()
        .from(R)
        .where(where)
        .orderBy(desc(R.createdAt))
        .limit(pageSize)
        .offset((Math.max(1, page) - 1) * pageSize),
      db.select({ value: count() }).from(R).where(where),
    ]);
    return { items: rows.map(toResult), total: value };
  }

  async markRedeemed(shopId: string, id: string, by: string, branchId: string | null, nowISO: string): Promise<boolean> {
    const res = await db
      .update(R)
      .set({ rewardStatus: "redeemed", redeemedAt: nowISO, redeemedBy: by, redeemedBranchId: branchId })
      .where(and(eq(R.shopId, shopId), eq(R.id, id), eq(R.rewardStatus, "pending")))
      .returning({ id: R.id });
    return res.length === 1;
  }

  async report(shopId: string, sinceISO: string | null): Promise<SpinReport> {
    const rWhere = sinceISO ? and(eq(R.shopId, shopId), gte(R.createdAt, sinceISO)) : eq(R.shopId, shopId);
    const tWhere = sinceISO ? and(eq(T.shopId, shopId), gte(T.createdAt, sinceISO)) : eq(T.shopId, shopId);
    const [byPrize, tickets] = await Promise.all([
      db
        .select({
          prizeName: R.prizeName,
          prizeType: R.prizeType,
          wins: count(),
          costSatang: sql<number>`coalesce(sum(${R.costSatang}), 0)`,
          points: sql<number>`coalesce(sum(${R.pointsAwarded}), 0)`,
          redeemed: sql<number>`coalesce(sum(case when ${R.rewardStatus} = 'redeemed' then 1 else 0 end), 0)`,
          pending: sql<number>`coalesce(sum(case when ${R.rewardStatus} = 'pending' then 1 else 0 end), 0)`,
        })
        .from(R)
        .where(rWhere)
        .groupBy(R.prizeName, R.prizeType)
        .orderBy(desc(count())),
      db
        .select({ status: T.status, n: count() })
        .from(T)
        .where(tWhere)
        .groupBy(T.status),
    ]);
    const tn = (s: string) => tickets.find((t) => t.status === s)?.n ?? 0;
    return {
      spins: byPrize.reduce((a, r) => a + r.wins, 0),
      ticketsIssued: tickets.reduce((a, t) => a + t.n, 0),
      ticketsAvailable: tn("available"),
      ticketsRevoked: tn("revoked"),
      pointsAwarded: byPrize.reduce((a, r) => a + Number(r.points), 0),
      costSatang: byPrize.reduce((a, r) => a + Number(r.costSatang), 0),
      rewardsPending: byPrize.reduce((a, r) => a + Number(r.pending), 0),
      rewardsRedeemed: byPrize.reduce((a, r) => a + Number(r.redeemed), 0),
      byPrize: byPrize.map((r) => ({
        prizeName: r.prizeName,
        prizeType: r.prizeType,
        wins: r.wins,
        costSatang: Number(r.costSatang),
        redeemed: Number(r.redeemed),
      })),
    };
  }
}
