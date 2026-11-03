import type { CreditEntryType } from "@/src/domain/services/credit";

export interface CreditLedgerEntry {
  id: string;
  shopId: string;
  type: CreditEntryType;
  amountSatang: number;
  balanceAfterSatang: number;
  reason: string | null;
  actorUserId: string | null;
  orderId: string | null;
  topupId: string | null;
  idempotencyKey: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export type CreditTopupStatus = "pending" | "approved" | "rejected";

export interface CreditTopup {
  id: string;
  shopId: string;
  packageId: string | null;
  amountSatang: number;
  bonusSatang: number;
  slipUrl: string;
  status: CreditTopupStatus;
  note: string | null;
  submittedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  verifyMeta: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreditWalletRow {
  shopId: string;
  shopName: string;
  shopSlug: string;
  balanceSatang: number;
  updatedAt: string | null;
}

export interface CreditDailySettlement {
  id: string;
  shopId: string;
  businessDate: string;
  periodStart: string;
  periodEnd: string;
  cutoffTime: string;
  salesSatang: number;
  orderCount: number;
  thresholdSatang: number;
  metric: "orders" | "sales";
  thresholdOrders: number;
  feeSatang: number;
  chargedSatang: number;
  ledgerEntryId: string | null;
  settledBy: string | null;
  createdAt: string;
}

export interface NumberedPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApplyCreditEntryInput {
  shopId: string;
  type: CreditEntryType;
  /** Signed change in satang. */
  amountSatang: number;
  reason?: string | null;
  actorUserId?: string | null;
  orderId?: string | null;
  topupId?: string | null;
  /** When set, a second apply with the same key is a no-op. */
  idempotencyKey?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface ICreditRepository {
  getConfigRaw(id: string): Promise<unknown | null>;
  saveConfig(id: string, shopId: string | null, config: unknown, updatedBy: string | null): Promise<void>;
  deleteConfig(id: string): Promise<void>;

  getBalance(shopId: string): Promise<number>;
  /** Atomic: insert ledger row + update balance. applied=false if the key already existed. */
  applyEntry(input: ApplyCreditEntryInput): Promise<{ applied: boolean; entry: CreditLedgerEntry | null }>;
  findEntryByKey(key: string): Promise<CreditLedgerEntry | null>;
  findEntry(id: string): Promise<CreditLedgerEntry | null>;
  pageLedger(shopId: string, opts: { page: number; pageSize: number; type?: CreditEntryType | null }): Promise<NumberedPage<CreditLedgerEntry>>;
  /** Sales sum + count of orders created in [from, to) with a status in `statuses`. */
  sumSalesBetween(shopId: string, fromISO: string, toISO: string, statuses: string[], basis: "total" | "subtotal"): Promise<{ salesSatang: number; orderCount: number }>;
  /** Shops the daily job considers (id, name, own billing cutoff). */
  listShopsForSettlement(): Promise<Array<{ id: string; name: string; billingCutoffTime: string | null }>>;
  findShopCutoff(shopId: string): Promise<{ exists: boolean; billingCutoffTime: string | null }>;
  findSettlement(shopId: string, businessDate: string): Promise<CreditDailySettlement | null>;
  findSettlementById(id: string): Promise<CreditDailySettlement | null>;
  /** Insert; returns null when (shop, date) already exists. */
  insertSettlement(input: Omit<CreditDailySettlement, "id" | "createdAt">): Promise<CreditDailySettlement | null>;
  pageSettlements(shopId: string, opts: { page: number; pageSize: number }): Promise<NumberedPage<CreditDailySettlement>>;
  pageWallets(opts: { page: number; pageSize: number; q?: string | null }): Promise<NumberedPage<CreditWalletRow>>;

  createTopup(input: Omit<CreditTopup, "id" | "status" | "reviewedBy" | "reviewedAt" | "rejectReason" | "createdAt">): Promise<CreditTopup>;
  findTopup(id: string): Promise<CreditTopup | null>;
  pageTopups(opts: { page: number; pageSize: number; shopId?: string | null; status?: CreditTopupStatus | null }): Promise<NumberedPage<CreditTopup>>;
  /** Move pending → approved/rejected. Returns null if it was no longer pending. */
  claimTopup(id: string, to: "approved" | "rejected", reviewedBy: string, rejectReason: string | null): Promise<CreditTopup | null>;
  /** Undo a claim (used if crediting fails after approval). */
  unclaimTopup(id: string): Promise<void>;
  setTopupVerifyMeta(id: string, meta: Record<string, unknown>): Promise<void>;
  countPendingTopups(): Promise<number>;
}
