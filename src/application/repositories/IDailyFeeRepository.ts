import type { DailyFeeCharge } from "@/src/domain/entities";
import type { DailyFeeTermsVersion } from "@/src/domain/services/daily-fee";

export type NewDailyFeeCharge = Omit<DailyFeeCharge, "id" | "createdAt" | "paidAt" | "paidBy">;

/** Daily-fee billing persistence (terms log + per-day charge records). */
export interface IDailyFeeRepository {
  /** Platform versions + this shop's override versions. */
  listTermsVersions(shopId: string): Promise<DailyFeeTermsVersion[]>;
  addTermsVersion(v: DailyFeeTermsVersion & { createdBy: string | null }): Promise<void>;
  /** Admin-only per-shop cutoff override (null = platform default). */
  getShopCutoff(shopId: string): Promise<string | null>;
  setShopCutoff(shopId: string, cutoff: string | null): Promise<void>;
  /** Latest charge by period end (the billing cursor). */
  lastCharge(shopId: string): Promise<DailyFeeCharge | null>;
  /** Idempotent: a (shop, businessDate) that already exists is left untouched. */
  insertCharge(c: NewDailyFeeCharge): Promise<void>;
  /** Newest first. */
  listCharges(shopId: string, limit?: number): Promise<DailyFeeCharge[]>;
  outstandingSatang(shopId: string): Promise<number>;
  /** Mark a due charge paid (scoped to the shop). Returns false if not due. */
  markPaid(shopId: string, chargeId: string, by: string): Promise<boolean>;
}
