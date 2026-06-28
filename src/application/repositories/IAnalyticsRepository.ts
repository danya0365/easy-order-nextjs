import type {
  AnalyticsBreakdownRow,
  AnalyticsDailyPoint,
  AnalyticsSummary,
} from "@/src/domain/entities";

/**
 * Read-model for one shop's order analytics. Every method is scoped by `shopId`
 * and bounded by `sinceISO` (inclusive lower bound on `orders.createdAt`).
 * Day buckets are Asia/Bangkok.
 */
export interface IAnalyticsRepository {
  summary(shopId: string, sinceISO: string): Promise<AnalyticsSummary>;
  daily(shopId: string, sinceISO: string): Promise<AnalyticsDailyPoint[]>;
  /** Order count + revenue grouped by order status. */
  byStatus(shopId: string, sinceISO: string): Promise<AnalyticsBreakdownRow[]>;
  /** Top customers by spend (named/known customers only). */
  topCustomers(
    shopId: string,
    sinceISO: string,
    limit?: number,
  ): Promise<AnalyticsBreakdownRow[]>;
}
