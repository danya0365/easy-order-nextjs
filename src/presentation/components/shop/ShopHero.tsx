import { Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { ReviewSummary, ShopImage } from "@/src/domain/entities";
import { StarRating } from "@/src/presentation/components/ui/StarRating";

/**
 * Social-profile style shop hero: a full-width cover banner (or brand gradient
 * fallback) with the circular profile avatar overlapping its bottom edge, then
 * the shop name, category, and rating centered below.
 */
export async function ShopHero({
  coverImage,
  profileImage,
  shopName,
  categoryName,
  rating,
}: {
  coverImage: ShopImage | null;
  profileImage: ShopImage | null;
  shopName: string;
  categoryName: string | null;
  rating: ReviewSummary;
}) {
  const t = await getTranslations("shop");
  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
      {/* Cover */}
      <div className="relative h-40 w-full">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- internal image route
          <img
            src={`/api/shop-images/${coverImage.id}`}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-linear-to-br from-brand-300 to-brand-500" />
        )}
      </div>

      {/* Avatar + identity (relative so it stacks above the cover) */}
      <div className="relative flex flex-col items-center px-4 pb-5 text-center">
        <div className="relative -mt-12 mb-2">
          {profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- internal image route
            <img
              src={`/api/shop-images/${profileImage.id}`}
              alt={shopName}
              className="size-24 rounded-full object-cover ring-4 ring-card"
            />
          ) : (
            <div className="flex size-24 items-center justify-center rounded-full bg-brand-100 text-brand-500 ring-4 ring-card">
              <Store className="size-10" />
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-brand-700">{shopName}</h1>

        {categoryName && (
          <span className="mt-1 inline-flex items-center rounded-full bg-muted-surface px-2.5 py-0.5 text-xs font-medium text-muted">
            {categoryName}
          </span>
        )}

        <div className="mt-2">
          {rating.count > 0 ? (
            <div className="flex items-center gap-1.5">
              <StarRating value={rating.average} size="sm" />
              <span className="text-sm text-muted">
                {rating.average.toFixed(1)} ({rating.count})
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted">{t("noReviews")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
