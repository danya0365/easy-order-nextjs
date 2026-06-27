import type { Payment, PaymentStatus } from "@/src/domain/entities";
import type { Page, PageOpts } from "./pagination";

export interface CreatePaymentInput {
  shopId: string;
  subscriptionId: string;
  amountSatang: number;
  daysToAdd: number;
  bonusDays: number;
  packageId: string | null;
  slipUrl: string;
  submittedBy: string;
  coversPeriodStartAt: string;
  coversPeriodDueAt: string;
}

export interface ResolvePaymentInput {
  status: Extract<PaymentStatus, "approved" | "rejected">;
  verifiedBy: string | null;
  verifiedAt: string;
  rejectReason?: string | null;
}

export interface IPaymentRepository {
  create(input: CreatePaymentInput): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  listByShop(shopId: string, limit?: number): Promise<Payment[]>;
  listByStatus(status: PaymentStatus): Promise<Payment[]>;
  /** Cursor-paginated, newest first (shop billing history). */
  pageByShop(shopId: string, opts?: PageOpts): Promise<Page<Payment>>;
  /** Cursor-paginated, newest first (admin review queue). */
  pageByStatus(status: PaymentStatus, opts?: PageOpts): Promise<Page<Payment>>;
  resolve(id: string, input: ResolvePaymentInput): Promise<Payment>;
  /** Every slip storage key — for orphaned-file cleanup. */
  allSlipKeys(): Promise<string[]>;
}
