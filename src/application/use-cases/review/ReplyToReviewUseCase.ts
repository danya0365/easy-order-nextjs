import type { ShopReview } from "@/src/domain/entities";
import type { IShopReviewRepository } from "@/src/application/repositories/IShopReviewRepository";

/** Shop owner replies to a review of their own shop. */
export class ReplyToReviewUseCase {
  constructor(private readonly reviews: IShopReviewRepository) {}

  async execute(
    shopId: string,
    reviewId: string,
    reply: string,
  ): Promise<ShopReview> {
    const review = await this.reviews.findById(reviewId);
    if (!review || review.shopId !== shopId) {
      throw new Error("ไม่พบรีวิวในร้านนี้");
    }
    const text = reply.trim();
    if (text.length < 1) throw new Error("กรุณาพิมพ์ข้อความตอบกลับ");
    if (text.length > 1000) throw new Error("ข้อความตอบกลับยาวเกินไป");
    return this.reviews.setReply(reviewId, text);
  }
}
