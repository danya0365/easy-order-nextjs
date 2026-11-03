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
  /** Deduction rows (charged or free) since an ISO instant. */
  countDeductionsSince(shopId: string, sinceISO: string): Promise<number>;
  /** Deductions made since the balance last was > 0 (grace counter). */
  graceUsed(shopId: string): Promise<number>;
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
