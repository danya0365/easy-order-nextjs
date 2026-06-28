import type { ShopReview } from "@/src/domain/entities";
import type { IShopReviewRepository } from "@/src/application/repositories/IShopReviewRepository";

export interface SubmitReviewInput {
  shopId: string;
  customerId: string;
  rating: number;
  comment: string | null;
}

export interface SubmitReviewResult {
  review: ShopReview;
  /** True only for a brand-new review (not an edit) — caller notifies the owner. */
  isNewReview: boolean;
}

/**
 * Create/update a customer's review. Returns whether it's brand-new so the
 * caller can notify the shop owner — deferred (not awaited inline) so the
 * customer's submit never waits on an owner notification / LINE push.
 */
export class SubmitReviewUseCase {
  constructor(private readonly reviews: IShopReviewRepository) {}

  async execute(input: SubmitReviewInput): Promise<SubmitReviewResult> {
    const rating = Math.round(input.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new Error("กรุณาให้ดาว 1–5");
    }
    const comment = input.comment?.trim() || null;
    if (comment && comment.length > 1000) {
      throw new Error("ข้อความรีวิวยาวเกินไป");
    }

    const existed = await this.reviews.findByCustomer(
      input.shopId,
      input.customerId,
    );

    const review = await this.reviews.upsert({
      shopId: input.shopId,
      customerId: input.customerId,
      rating,
      comment,
    });

    return { review, isNewReview: !existed };
  }
}
