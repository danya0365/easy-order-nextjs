import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import {
  AdminReviewList,
  type AdminReviewRow,
} from "@/src/presentation/components/reviews/AdminReviewList";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  await requireRole("platform_admin");
  const t = await getTranslations("reviews");

  const [page, shops] = await Promise.all([
    container.shopReviewRepository.pageAll({ limit: 50 }),
    container.shopRepository.list(),
  ]);
  const shopName = new Map(shops.map((s) => [s.id, s.name]));

  const items: AdminReviewRow[] = page.items.map((review) => ({
    review,
    shopName: shopName.get(review.shopId) ?? review.shopId,
  }));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title={t("adminTitle")} subtitle={t("adminSubtitle")} />
        <AdminReviewList items={items} />
      </Card>
    </div>
  );
}
