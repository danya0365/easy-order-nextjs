"use client";

import type { ReactNode } from "react";
import { CornerDownRight } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ShopReview } from "@/src/domain/entities";
import { StarRating } from "@/src/presentation/components/ui/StarRating";

/** "YYYY-MM-DD" from an ISO timestamp. */
function day(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Presentational review row: stars, comment, date, and the owner's reply.
 * `actions` renders a trailing control slot (reply box / hide button). Always
 * rendered inside a client list (LoadMore), so it's a client component.
 */
export function ReviewItem({
  review,
  actions,
}: {
  review: ShopReview;
  actions?: ReactNode;
}) {
  const t = useTranslations("reviews");
  return (
    <li className="flex flex-col gap-1.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <StarRating value={review.rating} size="sm" />
        <span className="text-xs text-muted">{day(review.createdAt)}</span>
      </div>
      {review.comment && (
        <p className="text-sm text-foreground">{review.comment}</p>
      )}

      {review.ownerReply && (
        <div className="ml-3 flex gap-1.5 rounded-lg bg-muted-surface px-3 py-2">
          <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-muted" />
          <div>
            <p className="text-xs font-medium text-muted">{t("ownerReplied")}</p>
            <p className="text-sm text-foreground">{review.ownerReply}</p>
          </div>
        </div>
      )}

      {actions}
    </li>
  );
}
