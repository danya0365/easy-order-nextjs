import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { StarRating } from "@/src/presentation/components/ui/StarRating";
import { OwnerReviewList } from "@/src/presentation/components/reviews/OwnerReviewList";

export const dynamic = "force-dynamic";

export default async function ShopReviewsPage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("reviews");

  const [summary, page] = await Promise.all([
    container.shopReviewRepository.summary(shopId),
    // Owner sees hidden reviews too (so they know what admins removed).
    container.shopReviewRepository.pageByShop(shopId, {
      includeHidden: true,
      limit: 50,
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title={t("sectionTitle")} />
        {summary.count > 0 ? (
          <div className="flex items-center gap-2">
            <StarRating value={summary.average} />
            <span className="text-sm text-muted">
              {summary.average.toFixed(1)} ({summary.count})
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted">{t("noReviews")}</p>
        )}
      </Card>

      <Card>
        <OwnerReviewList reviews={page.items} />
      </Card>
    </div>
  );
}
