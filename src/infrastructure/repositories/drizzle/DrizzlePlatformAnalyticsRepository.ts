import "server-only";

import { desc, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type {
  AnalyticsBreakdownRow,
  AnalyticsDailyPoint,
  AnalyticsSummary,
} from "@/src/domain/entities";
import type { IPlatformAnalyticsRepository } from "@/src/application/repositories/IPlatformAnalyticsRepository";

const BKK_DAY = sql<string>`strftime('%Y-%m-%d', ${schema.orders.createdAt}, '+7 hours')`;
const REVENUE = sql<number>`coalesce(sum(${schema.orders.totalSatang}), 0)`;
const COUNT = sql<number>`count(*)`;

export class DrizzlePlatformAnalyticsRepository
  implements IPlatformAnalyticsRepository
{
  async summary(sinceISO: string): Promise<AnalyticsSummary> {
    const [r] = await db
      .select({
        orders: COUNT,
        revenueSatang: REVENUE,
        // For the platform view this field carries the active-shop count.
        customers: sql<number>`count(distinct ${schema.orders.shopId})`,
      })
      .from(schema.orders)
      .where(gte(schema.orders.createdAt, sinceISO));
    return {
      orders: Number(r?.orders ?? 0),
      revenueSatang: Number(r?.revenueSatang ?? 0),
      customers: Number(r?.customers ?? 0),
    };
  }

  async daily(sinceISO: string): Promise<AnalyticsDailyPoint[]> {
    const rows = await db
      .select({ day: BKK_DAY, orders: COUNT, revenueSatang: REVENUE })
      .from(schema.orders)
      .where(gte(schema.orders.createdAt, sinceISO))
      .groupBy(BKK_DAY)
      .orderBy(BKK_DAY);
    return rows.map((r) => ({
      day: r.day,
      orders: Number(r.orders),
      revenueSatang: Number(r.revenueSatang),
    }));
  }

  async byShop(sinceISO: string, limit = 10): Promise<AnalyticsBreakdownRow[]> {
    const rows = await db
      .select({
        key: schema.shops.id,
        name: schema.shops.name,
        orders: COUNT,
        revenueSatang: REVENUE,
      })
      .from(schema.orders)
      .innerJoin(schema.shops, eq(schema.orders.shopId, schema.shops.id))
      .where(gte(schema.orders.createdAt, sinceISO))
      .groupBy(schema.shops.id)
      .orderBy(desc(COUNT))
      .limit(limit);
    return rows.map((r) => ({
      key: r.key,
      name: r.name,
      orders: Number(r.orders),
      revenueSatang: Number(r.revenueSatang),
    }));
  }
}
