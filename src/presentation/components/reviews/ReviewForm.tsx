"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

import { submitReviewAction } from "@/src/presentation/actions/review-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { Textarea } from "@/src/presentation/components/ui/Textarea";
import { cn } from "@/src/presentation/components/ui/cn";
import { useToast } from "@/src/presentation/components/ui/Toast";

export function ReviewForm({
  slug,
  initialRating,
  initialComment,
}: {
  slug: string;
  initialRating: number;
  initialComment: string;
}) {
  const t = useTranslations("reviews");
  const toast = useToast();
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [pending, start] = useTransition();
  const editing = initialRating > 0;

  function submit() {
    if (rating < 1) {
      toast.error(t("pickStars"));
      return;
    }
    start(async () => {
      const res = await submitReviewAction({
        slug,
        rating,
        comment: comment.trim() || null,
      });
      if (res.ok) toast.success(editing ? t("updated") : t("submitted"));
      else toast.error(res.error || t("error"));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-foreground">
        {editing ? t("editYours") : t("rateThisShop")}
      </p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={t("nStars", { n })}
            onClick={() => setRating(n)}
            className="p-0.5"
          >
            <Star
              className={cn(
                "size-8 transition",
                n <= rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted hover:text-amber-300",
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        rows={3}
        maxLength={1000}
        value={comment}
        placeholder={t("commentPlaceholder")}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button onClick={submit} disabled={pending} className="w-fit">
        {pending ? t("saving") : editing ? t("update") : t("submit")}
      </Button>
    </div>
  );
}
