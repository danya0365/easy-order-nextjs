import type { ShopReview } from "@/src/domain/entities";
import type { IShopReviewRepository } from "@/src/application/repositories/IShopReviewRepository";

/** Platform admin hides/unhides an abusive review. */
export class SetReviewHiddenUseCase {
  constructor(private readonly reviews: IShopReviewRepository) {}

  async execute(reviewId: string, hidden: boolean): Promise<ShopReview> {
    const review = await this.reviews.findById(reviewId);
    if (!review) throw new Error("ไม่พบรีวิว");
    return this.reviews.setHidden(reviewId, hidden);
  }
}
