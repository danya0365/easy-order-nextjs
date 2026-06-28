"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

import { setReviewHiddenAction } from "@/src/presentation/actions/review-actions";
import type { ShopReview } from "@/src/domain/entities";
import { StarRating } from "@/src/presentation/components/ui/StarRating";
import { Button } from "@/src/presentation/components/ui/Button";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { useToast } from "@/src/presentation/components/ui/Toast";
import { formatDateTime } from "@/src/presentation/lib/format-date";

export interface AdminReviewRow {
  review: ShopReview;
  shopName: string;
}

export function AdminReviewList({ items }: { items: AdminReviewRow[] }) {
  const t = useTranslations("reviews");
  if (items.length === 0) {
    return <EmptyState icon={<Star />} title={t("noReviews")} />;
  }
  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map(({ review, shopName }) => (
        <AdminReviewItem key={review.id} review={review} shopName={shopName} />
      ))}
    </ul>
  );
}

function AdminReviewItem({
  review,
  shopName,
}: {
  review: ShopReview;
  shopName: string;
}) {
  const t = useTranslations("reviews");
  const toast = useToast();
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      const res = await setReviewHiddenAction(review.id, !review.isHidden);
      if (res.error) toast.error(res.error);
    });
  }

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{shopName}</span>
          {review.isHidden && <Badge tone="neutral">{t("hiddenBadge")}</Badge>}
        </div>
        <span className="text-xs text-muted">
          {formatDateTime(review.createdAt)}
        </span>
      </div>
      <StarRating value={review.rating} size="sm" />
      {review.comment && (
        <p className="text-sm text-foreground">{review.comment}</p>
      )}
      <Button
        size="sm"
        variant={review.isHidden ? "outline" : "danger"}
        onClick={toggle}
        disabled={pending}
        className="w-fit"
      >
        {review.isHidden ? t("unhide") : t("hide")}
      </Button>
    </li>
  );
}
