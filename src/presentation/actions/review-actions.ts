"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { requireShopWrite, requireRole } from "@/src/infrastructure/auth/session";
import { getMemberToken } from "@/src/infrastructure/auth/member";
import { getClientIp } from "@/src/presentation/lib/request-ip";
import { SubmitReviewUseCase } from "@/src/application/use-cases/review/SubmitReviewUseCase";
import { ReplyToReviewUseCase } from "@/src/application/use-cases/review/ReplyToReviewUseCase";
import { SetReviewHiddenUseCase } from "@/src/application/use-cases/review/SetReviewHiddenUseCase";

/**
 * A device-bound customer posts/edits their review of a shop. The customer is
 * resolved server-side from the member token (httpOnly cookie) — never trusted
 * from client input — so only someone who has bound their device at this shop
 * can review it.
 */
export async function submitReviewAction(input: {
  slug: string;
  rating: number;
  comment: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const shop = await container.shopRepository.findBySlug(input.slug);
    if (!shop) return { ok: false, error: "ไม่พบร้านค้า" };

    const token = await getMemberToken(input.slug);
    const bound = token
      ? await container.customerDeviceRepository.findByToken(token)
      : null;
    if (!bound || bound.customer.shopId !== shop.id) {
      return { ok: false, error: "ต้องสแกน QR ผูกอุปกรณ์ที่ร้านก่อนรีวิว" };
    }

    const guard = await container.sensitiveActionGuard.check({
      key: `review:${shop.id}:${bound.customer.id}`,
      limit: 10,
      windowMs: 60 * 60 * 1000,
      shopId: shop.id,
      ip: await getClientIp(),
      alertTitle: "รีวิวถี่ผิดปกติ",
      alertBody: `customer ${bound.customer.id} @ shop ${shop.id}`,
    });
    if (!guard.allowed) return { ok: false, error: "ลองใหม่ภายหลัง" };

    await new SubmitReviewUseCase(container.shopReviewRepository).execute({
      shopId: shop.id,
      customerId: bound.customer.id,
      rating: input.rating,
      comment: input.comment,
    });
    revalidatePath(`/s/${input.slug}`);
    revalidatePath("/shop/reviews");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Next page of a shop's public reviews (hidden already excluded). */
export async function loadMorePublicReviewsAction(
  shopId: string,
  cursor: string,
) {
  return container.shopReviewRepository.pageByShop(shopId, { cursor });
}

/** Shop owner replies to a review of their own shop. */
export async function replyToReviewAction(
  reviewId: string,
  reply: string,
): Promise<{ error?: string }> {
  try {
    const { shopId } = await requireShopWrite();
    await new ReplyToReviewUseCase(container.shopReviewRepository).execute(
      shopId,
      reviewId,
      reply,
    );
    revalidatePath("/shop/reviews");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Platform admin hides/unhides an abusive review. */
export async function setReviewHiddenAction(
  reviewId: string,
  hidden: boolean,
): Promise<{ error?: string }> {
  try {
    await requireRole("platform_admin");
    await new SetReviewHiddenUseCase(container.shopReviewRepository).execute(
      reviewId,
      hidden,
    );
    revalidatePath("/admin/reviews");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
