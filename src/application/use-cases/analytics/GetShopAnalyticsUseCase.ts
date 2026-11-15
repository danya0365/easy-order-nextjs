import type {
  AnalyticsBreakdownRow,
  AnalyticsDailyPoint,
  AnalyticsSummary,
} from "@/src/domain/entities";
import type {
  AnalyticsBranchScope,
  IAnalyticsRepository,
} from "@/src/application/repositories/IAnalyticsRepository";

export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export interface ShopAnalytics {
  rangeDays: AnalyticsRange;
  summary: AnalyticsSummary;
  daily: AnalyticsDailyPoint[];
  byStatus: AnalyticsBreakdownRow[];
  topCustomers: AnalyticsBreakdownRow[];
  /** Whole-shop split per branch (key = branch id, "" = unassigned). */
  byBranch: AnalyticsBreakdownRow[];
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
    branch?: AnalyticsBranchScope,
  ): Promise<ShopAnalytics> {
    const sinceISO = new Date(
      now.getTime() - rangeDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    const [summary, daily, byStatus, topCustomers, byBranch] = await Promise.all([
      this.analytics.summary(shopId, sinceISO, branch),
      this.analytics.daily(shopId, sinceISO, branch),
      this.analytics.byStatus(shopId, sinceISO, branch),
      this.analytics.topCustomers(shopId, sinceISO, 5, branch),
      this.analytics.byBranch(shopId, sinceISO),
    ]);
    return { rangeDays, summary, daily, byStatus, topCustomers, byBranch };
  }
}
