import type {
  AnalyticsBreakdownRow,
  AnalyticsDailyPoint,
  AnalyticsSummary,
} from "@/src/domain/entities";
import type { IPlatformAnalyticsRepository } from "@/src/application/repositories/IPlatformAnalyticsRepository";
import type { AnalyticsRange } from "./GetShopAnalyticsUseCase";

export interface PlatformAnalytics {
  rangeDays: AnalyticsRange;
  summary: AnalyticsSummary;
  daily: AnalyticsDailyPoint[];
  byShop: AnalyticsBreakdownRow[];
}

export class GetPlatformAnalyticsUseCase {
  constructor(private readonly analytics: IPlatformAnalyticsRepository) {}

  async execute(
    rangeDays: AnalyticsRange,
    now: Date = new Date(),
  ): Promise<PlatformAnalytics> {
    const sinceISO = new Date(
      now.getTime() - rangeDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    const [summary, daily, byShop] = await Promise.all([
      this.analytics.summary(sinceISO),
      this.analytics.daily(sinceISO),
      this.analytics.byShop(sinceISO),
    ]);
    return { rangeDays, summary, daily, byShop };
  }
}
