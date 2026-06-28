import type { ReviewSummary, ShopReview } from "@/src/domain/entities";
import type { Page, PageOpts } from "./pagination";

export interface UpsertReviewInput {
  shopId: string;
  customerId: string;
  rating: number;
  comment: string | null;
}

export interface ListReviewsOpts extends PageOpts {
  /** Public views pass false to exclude admin-hidden reviews. */
  includeHidden?: boolean;
}

export interface IShopReviewRepository {
  /** Create or update the customer's single review for the shop. */
  upsert(input: UpsertReviewInput): Promise<ShopReview>;
  findById(id: string): Promise<ShopReview | null>;
  findByCustomer(
    shopId: string,
    customerId: string,
  ): Promise<ShopReview | null>;
  /** Keyset page of one shop's reviews (newest first). */
  pageByShop(shopId: string, opts?: ListReviewsOpts): Promise<Page<ShopReview>>;
  /** Keyset page across all shops (admin moderation). */
  pageAll(opts?: PageOpts): Promise<Page<ShopReview>>;
  setReply(id: string, reply: string): Promise<ShopReview>;
  setHidden(id: string, hidden: boolean): Promise<ShopReview>;
  /** Average rating + count, excluding hidden reviews. */
  summary(shopId: string): Promise<ReviewSummary>;
  /** Batched summaries for many shops (shopId → summary; missing = 0/0). */
  summariesByShop(shopIds: string[]): Promise<Record<string, ReviewSummary>>;
}
