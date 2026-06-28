import { MessageSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Page } from "@/src/application/repositories/pagination";
import type { ReviewSummary, ShopReview } from "@/src/domain/entities";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { StarRating } from "@/src/presentation/components/ui/StarRating";
import { ReviewForm } from "./ReviewForm";
import { PublicReviewList } from "./PublicReviewList";

/**
 * Public reviews block: average summary, the review form (device-bound customers
 * only), and the paginated list.
 */
export async function ShopReviewsSection({
  slug,
  shopId,
  summary,
  initial,
  myReview,
  canReview,
}: {
  slug: string;
  shopId: string;
  summary: ReviewSummary;
  initial: Page<ShopReview>;
  myReview: ShopReview | null;
  canReview: boolean;
}) {
  const t = await getTranslations("reviews");
  return (
    <Card>
      <CardHeader
        title={t("sectionTitle")}
        subtitle={
          summary.count > 0
            ? t("summary", {
                avg: summary.average.toFixed(1),
                count: summary.count,
              })
            : t("noReviews")
        }
        action={
          summary.count > 0 ? (
            <StarRating value={summary.average} size="sm" />
          ) : undefined
        }
      />

      {canReview ? (
        <div className="mb-4 rounded-xl border border-border p-3">
          <ReviewForm
            slug={slug}
            initialRating={myReview?.rating ?? 0}
            initialComment={myReview?.comment ?? ""}
          />
        </div>
      ) : (
        <p className="mb-4 text-xs text-muted">{t("bindToReview")}</p>
      )}

      {initial.items.length === 0 ? (
        <EmptyState icon={<MessageSquare />} title={t("noReviews")} />
      ) : (
        <PublicReviewList
          shopId={shopId}
          initialItems={initial.items}
          initialCursor={initial.nextCursor}
        />
      )}
    </Card>
  );
}
