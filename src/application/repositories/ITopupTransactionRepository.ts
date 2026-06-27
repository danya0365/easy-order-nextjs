import type { TopupTransaction, TopupTxType } from "@/src/domain/entities";
import type { Page, PageOpts } from "./pagination";

export interface CreateTopupTransactionInput {
  shopId: string;
  paymentId?: string | null;
  type: TopupTxType;
  daysAdded: number;
  bonusDaysAdded: number;
  amountSatang: number;
  expiryBeforeAt?: string | null;
  expiryAfterAt: string;
  performedBy: string;
  note?: string | null;
}

export interface ITopupTransactionRepository {
  create(input: CreateTopupTransactionInput): Promise<TopupTransaction>;
  listByShop(shopId: string, limit?: number): Promise<TopupTransaction[]>;
  /** Cursor-paginated, newest first (shop top-up history). */
  pageByShop(shopId: string, opts?: PageOpts): Promise<Page<TopupTransaction>>;
}
