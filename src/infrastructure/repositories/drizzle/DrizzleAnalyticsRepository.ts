import "server-only";

import { and, desc, eq, gte, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type {
  AnalyticsBreakdownRow,
  AnalyticsDailyPoint,
  AnalyticsSummary,
} from "@/src/domain/entities";
import type {
  AnalyticsBranchScope,
  IAnalyticsRepository,
} from "@/src/application/repositories/IAnalyticsRepository";

// Bucket an ISO-UTC timestamp into its Asia/Bangkok (+7) calendar day.
const BKK_DAY = sql<string>`strftime('%Y-%m-%d', ${schema.orders.createdAt}, '+7 hours')`;
const REVENUE = sql<number>`coalesce(sum(${schema.orders.totalSatang}), 0)`;
const COUNT = sql<number>`count(*)`;

function branchCond(branch?: AnalyticsBranchScope): SQL | undefined {
  if (!branch) return undefined;
  return branch.includeUnassigned
    ? or(eq(schema.orders.branchId, branch.branchId), isNull(schema.orders.branchId))
    : eq(schema.orders.branchId, branch.branchId);
}

export class DrizzleAnalyticsRepository implements IAnalyticsRepository {
  async summary(
    shopId: string,
    sinceISO: string,
    branch?: AnalyticsBranchScope,
  ): Promise<AnalyticsSummary> {
    const [r] = await db
      .select({
        orders: COUNT,
        revenueSatang: REVENUE,
        customers: sql<number>`count(distinct ${schema.orders.customerId})`,
      })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.shopId, shopId),
          gte(schema.orders.createdAt, sinceISO),
          branchCond(branch),
        ),
      );
    return {
      orders: Number(r?.orders ?? 0),
      revenueSatang: Number(r?.revenueSatang ?? 0),
      customers: Number(r?.customers ?? 0),
    };
  }

  async daily(
    shopId: string,
    sinceISO: string,
    branch?: AnalyticsBranchScope,
  ): Promise<AnalyticsDailyPoint[]> {
    const rows = await db
      .select({ day: BKK_DAY, orders: COUNT, revenueSatang: REVENUE })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.shopId, shopId),
          gte(schema.orders.createdAt, sinceISO),
          branchCond(branch),
        ),
      )
      .groupBy(BKK_DAY)
      .orderBy(BKK_DAY);
    return rows.map((r) => ({
      day: r.day,
      orders: Number(r.orders),
      revenueSatang: Number(r.revenueSatang),
    }));
  }

  async byStatus(
    shopId: string,
    sinceISO: string,
    branch?: AnalyticsBranchScope,
  ): Promise<AnalyticsBreakdownRow[]> {
    const rows = await db
      .select({
        key: schema.orders.status,
        orders: COUNT,
        revenueSatang: REVENUE,
      })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.shopId, shopId),
          gte(schema.orders.createdAt, sinceISO),
          branchCond(branch),
        ),
      )
      .groupBy(schema.orders.status);
    return rows.map((r) => ({
      key: r.key,
      name: r.key,
      orders: Number(r.orders),
      revenueSatang: Number(r.revenueSatang),
    }));
  }

  async topCustomers(
    shopId: string,
    sinceISO: string,
    limit = 5,
    branch?: AnalyticsBranchScope,
  ): Promise<AnalyticsBreakdownRow[]> {
    const rows = await db
      .select({
        key: schema.customers.id,
        displayName: schema.customers.displayName,
        phone: schema.customers.phone,
        orders: COUNT,
        revenueSatang: REVENUE,
      })
      .from(schema.orders)
      .innerJoin(
        schema.customers,
        eq(schema.orders.customerId, schema.customers.id),
      )
      .where(
        and(
          eq(schema.orders.shopId, shopId),
          gte(schema.orders.createdAt, sinceISO),
          branchCond(branch),
          isNotNull(schema.orders.customerId),
        ),
      )
      .groupBy(schema.customers.id)
      .orderBy(desc(REVENUE))
      .limit(limit);
    return rows.map((r) => ({
      key: r.key,
      name: r.displayName || r.phone,
      orders: Number(r.orders),
      revenueSatang: Number(r.revenueSatang),
    }));
  }

  async byBranch(
    shopId: string,
    sinceISO: string,
  ): Promise<AnalyticsBreakdownRow[]> {
    const KEY = sql<string>`coalesce(${schema.orders.branchId}, '')`;
    const rows = await db
      .select({ key: KEY, orders: COUNT, revenueSatang: REVENUE })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.shopId, shopId),
          gte(schema.orders.createdAt, sinceISO),
        ),
      )
      .groupBy(KEY);
    return rows.map((r) => ({
      key: r.key,
      name: r.key,
      orders: Number(r.orders),
      revenueSatang: Number(r.revenueSatang),
    }));
  }
}
