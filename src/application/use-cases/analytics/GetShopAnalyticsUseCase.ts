import type {
  AnalyticsBreakdownRow,
  AnalyticsDailyPoint,
  AnalyticsSummary,
} from "@/src/domain/entities";
import type { IAnalyticsRepository } from "@/src/application/repositories/IAnalyticsRepository";

export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export interface ShopAnalytics {
  rangeDays: AnalyticsRange;
  summary: AnalyticsSummary;
  daily: AnalyticsDailyPoint[];
  byStatus: AnalyticsBreakdownRow[];
  topCustomers: AnalyticsBreakdownRow[];
}

/** Normalise an arbitrary range input to one of the allowed windows. */
export function normalizeRange(input: unknown): AnalyticsRange {
  const n = Number(input);
  return (ANALYTICS_RANGES as readonly number[]).includes(n)
    ? (n as AnalyticsRange)
    : 30;
}

export class GetShopAnalyticsUseCase {
  constructor(private readonly analytics: IAnalyticsRepository) {}

  async execute(
    shopId: string,
    rangeDays: AnalyticsRange,
    now: Date = new Date(),
  ): Promise<ShopAnalytics> {
    const sinceISO = new Date(
      now.getTime() - rangeDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    const [summary, daily, byStatus, topCustomers] = await Promise.all([
      this.analytics.summary(shopId, sinceISO),
      this.analytics.daily(shopId, sinceISO),
      this.analytics.byStatus(shopId, sinceISO),
      this.analytics.topCustomers(shopId, sinceISO),
    ]);
    return { rangeDays, summary, daily, byStatus, topCustomers };
  }
}
