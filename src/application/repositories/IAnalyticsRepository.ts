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
/**
 * Optional branch scope (omitted = whole shop, all branches). includeUnassigned
 * = also count legacy NULL-branch orders (set it for the main branch).
 */
export interface AnalyticsBranchScope {
  branchId: string;
  includeUnassigned?: boolean;
}

export interface IAnalyticsRepository {
  summary(
    shopId: string,
    sinceISO: string,
    branch?: AnalyticsBranchScope,
  ): Promise<AnalyticsSummary>;
  daily(
    shopId: string,
    sinceISO: string,
    branch?: AnalyticsBranchScope,
  ): Promise<AnalyticsDailyPoint[]>;
  /** Order count + revenue grouped by order status. */
  byStatus(
    shopId: string,
    sinceISO: string,
    branch?: AnalyticsBranchScope,
  ): Promise<AnalyticsBreakdownRow[]>;
  /** Top customers by spend (named/known customers only). */
  topCustomers(
    shopId: string,
    sinceISO: string,
    limit?: number,
    branch?: AnalyticsBranchScope,
  ): Promise<AnalyticsBreakdownRow[]>;
  /** Order count + revenue per branch (key = branch id, "" = no branch). */
  byBranch(shopId: string, sinceISO: string): Promise<AnalyticsBreakdownRow[]>;
}
