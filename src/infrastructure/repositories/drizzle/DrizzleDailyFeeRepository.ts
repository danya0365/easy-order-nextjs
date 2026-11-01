import "server-only";

import { and, desc, eq, isNull, or, sum } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { DailyFeeCharge } from "@/src/domain/entities";
import type { DailyFeeTermsVersion } from "@/src/domain/services/daily-fee";
import type {
  IDailyFeeRepository,
  NewDailyFeeCharge,
} from "@/src/application/repositories/IDailyFeeRepository";

type ChargeRow = typeof schema.dailyFeeCharges.$inferSelect;

function toCharge(r: ChargeRow): DailyFeeCharge {
  return {
    id: r.id,
    shopId: r.shopId,
    businessDate: r.businessDate,
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    orderCount: r.orderCount,
    enabled: r.enabled,
    threshold: r.threshold,
    feeSatang: r.feeSatang,
    cutoffTime: r.cutoffTime,
    amountSatang: r.amountSatang,
    status: r.status,
    paidAt: r.paidAt ?? null,
    paidBy: r.paidBy ?? null,
    createdAt: r.createdAt,
  };
}

export class DrizzleDailyFeeRepository implements IDailyFeeRepository {
  async listTermsVersions(shopId: string): Promise<DailyFeeTermsVersion[]> {
    const t = schema.dailyFeeTerms;
    const rows = await db
      .select()
      .from(t)
      .where(or(isNull(t.shopId), eq(t.shopId, shopId)))
      .orderBy(t.effectiveAt);
    return rows.map((r) => ({
      shopId: r.shopId ?? null,
      effectiveAt: r.effectiveAt,
      enabled: r.enabled,
      threshold: r.threshold,
      feeSatang: r.feeSatang,
      cutoffTime: r.cutoffTime ?? null,
    }));
  }

  async addTermsVersion(v: DailyFeeTermsVersion & { createdBy: string | null }): Promise<void> {
    await db.insert(schema.dailyFeeTerms).values({
      shopId: v.shopId,
      effectiveAt: v.effectiveAt,
      enabled: v.enabled,
      threshold: v.threshold,
      feeSatang: v.feeSatang,
      cutoffTime: v.cutoffTime,
      createdBy: v.createdBy,
    });
  }

  async getShopCutoff(shopId: string): Promise<string | null> {
    const [r] = await db
      .select({ c: schema.shops.billingCutoffTime })
      .from(schema.shops)
      .where(eq(schema.shops.id, shopId));
    return r?.c ?? null;
  }

  async setShopCutoff(shopId: string, cutoff: string | null): Promise<void> {
    await db
      .update(schema.shops)
      .set({ billingCutoffTime: cutoff })
      .where(eq(schema.shops.id, shopId));
  }

  async lastCharge(shopId: string): Promise<DailyFeeCharge | null> {
    const [r] = await db
      .select()
      .from(schema.dailyFeeCharges)
      .where(eq(schema.dailyFeeCharges.shopId, shopId))
      .orderBy(desc(schema.dailyFeeCharges.periodEnd))
      .limit(1);
    return r ? toCharge(r) : null;
  }

  async insertCharge(c: NewDailyFeeCharge): Promise<void> {
    await db.insert(schema.dailyFeeCharges).values(c).onConflictDoNothing();
  }

  async listCharges(shopId: string, limit = 60): Promise<DailyFeeCharge[]> {
    const rows = await db
      .select()
      .from(schema.dailyFeeCharges)
      .where(eq(schema.dailyFeeCharges.shopId, shopId))
      .orderBy(desc(schema.dailyFeeCharges.periodEnd))
      .limit(limit);
    return rows.map(toCharge);
  }

  async outstandingSatang(shopId: string): Promise<number> {
    const [r] = await db
      .select({ v: sum(schema.dailyFeeCharges.amountSatang) })
      .from(schema.dailyFeeCharges)
      .where(
        and(
          eq(schema.dailyFeeCharges.shopId, shopId),
          eq(schema.dailyFeeCharges.status, "due"),
        ),
      );
    return Number(r?.v ?? 0);
  }

  async markPaid(shopId: string, chargeId: string, by: string): Promise<boolean> {
    const rows = await db
      .update(schema.dailyFeeCharges)
      .set({ status: "paid", paidAt: new Date().toISOString(), paidBy: by })
      .where(
        and(
          eq(schema.dailyFeeCharges.shopId, shopId),
          eq(schema.dailyFeeCharges.id, chargeId),
          eq(schema.dailyFeeCharges.status, "due"),
        ),
      )
      .returning({ id: schema.dailyFeeCharges.id });
    return rows.length > 0;
  }
}
