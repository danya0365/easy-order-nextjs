"use client";

import { loadMorePublicReviewsAction } from "@/src/presentation/actions/review-actions";
import type { ShopReview } from "@/src/domain/entities";
import { LoadMore } from "@/src/presentation/components/ui/LoadMore";
import { ReviewItem } from "./ReviewItem";

/** Paginated public review list for a shop (hidden reviews already excluded). */
export function PublicReviewList({
  shopId,
  initialItems,
  initialCursor,
}: {
  shopId: string;
  initialItems: ShopReview[];
  initialCursor: string | null;
}) {
  return (
    <LoadMore<ShopReview>
      initialItems={initialItems}
      initialCursor={initialCursor}
      loadMore={(cursor) => loadMorePublicReviewsAction(shopId, cursor)}
      getKey={(r) => r.id}
      renderItem={(r) => <ReviewItem review={r} />}
    />
  );
}
