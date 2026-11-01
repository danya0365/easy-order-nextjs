import type { DemoPlan } from "@/src/domain/services/demo-data";

export interface DemoDataCounts {
  orders: number;
  customers: number;
  riders: number;
}

/** Persists / removes rows created by the admin demo-data tool (tracked per shop). */
export interface IDemoDataRepository {
  insertPlan(shopId: string, plan: DemoPlan, batchId: string): Promise<DemoDataCounts>;
  /** Deletes ONLY rows recorded in the demo tracking table for this shop. */
  clear(shopId: string): Promise<DemoDataCounts>;
  counts(shopId: string): Promise<DemoDataCounts>;
}
