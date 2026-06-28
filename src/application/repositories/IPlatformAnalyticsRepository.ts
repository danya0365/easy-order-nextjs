import type {
  AnalyticsBreakdownRow,
  AnalyticsDailyPoint,
  AnalyticsSummary,
} from "@/src/domain/entities";

/**
 * Platform-wide order analytics across all shops. Bounded by `sinceISO`.
 * `summary().customers` field carries the active-shop count for the platform view.
 */
export interface IPlatformAnalyticsRepository {
  summary(sinceISO: string): Promise<AnalyticsSummary>;
  daily(sinceISO: string): Promise<AnalyticsDailyPoint[]>;
  /** Top shops by order count + revenue. */
  byShop(sinceISO: string, limit?: number): Promise<AnalyticsBreakdownRow[]>;
}
