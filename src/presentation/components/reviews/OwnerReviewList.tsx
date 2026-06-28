"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { replyToReviewAction } from "@/src/presentation/actions/review-actions";
import type { ShopReview } from "@/src/domain/entities";
import { StarRating } from "@/src/presentation/components/ui/StarRating";
import { Button } from "@/src/presentation/components/ui/Button";
import { Textarea } from "@/src/presentation/components/ui/Textarea";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { useToast } from "@/src/presentation/components/ui/Toast";
import { formatDateTime } from "@/src/presentation/lib/format-date";
import { Star } from "lucide-react";

export function OwnerReviewList({ reviews }: { reviews: ShopReview[] }) {
  const t = useTranslations("reviews");
  if (reviews.length === 0) {
    return <EmptyState icon={<Star />} title={t("noReviews")} />;
  }
  return (
    <ul className="flex flex-col divide-y divide-border">
      {reviews.map((r) => (
        <OwnerReviewItem key={r.id} review={r} />
      ))}
    </ul>
  );
}

function OwnerReviewItem({ review }: { review: ShopReview }) {
  const t = useTranslations("reviews");
  const toast = useToast();
  const [reply, setReply] = useState(review.ownerReply ?? "");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function send() {
    start(async () => {
      const res = await replyToReviewAction(review.id, reply);
      if (res.error) toast.error(res.error);
      else {
        toast.success(t("replied"));
        setOpen(false);
      }
    });
  }

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-center justify-between gap-2">
        <StarRating value={review.rating} size="sm" />
        <span className="text-xs text-muted">
          {formatDateTime(review.createdAt)}
        </span>
      </div>
      {review.comment && (
        <p className="text-sm text-foreground">{review.comment}</p>
      )}
      {review.ownerReply && !open && (
        <div className="rounded-lg bg-muted-surface px-3 py-2">
          <p className="text-xs font-medium text-brand-700">{t("ownerReply")}</p>
          <p className="text-sm text-muted">{review.ownerReply}</p>
        </div>
      )}
      {open ? (
        <div className="flex flex-col gap-2">
          <Textarea
            rows={2}
            maxLength={1000}
            value={reply}
            placeholder={t("replyPlaceholder")}
            onChange={(e) => setReply(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={send} disabled={pending}>
              {pending ? t("saving") : t("sendReply")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-fit text-sm font-medium text-brand-700 hover:underline"
        >
          {review.ownerReply ? t("editReply") : t("reply")}
        </button>
      )}
    </li>
  );
}
