import { CircleCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { AdminPaymentQueue } from "@/src/presentation/components/admin/AdminPaymentQueue";
import { TOPUP_PROMO, isPromoActive } from "@/src/domain/services/topup-pricing";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  await requireRole("platform_admin");
  const t = await getTranslations("adminPages");
  const tb = await getTranslations("billing");
  const page = await container.paymentRepository.pageByStatus("pending");
  const shops = await container.shopRepository.list();
  const shopName = new Map(shops.map((s) => [s.id, s.name]));
  const items = page.items.map((payment) => ({
    payment,
    shopName: shopName.get(payment.shopId) ?? payment.shopId,
  }));

  return (
    <Card>
      <CardHeader title={t("paymentsQueueTitle")} />
      {isPromoActive() && (
        <p className="mb-3 rounded-lg bg-accent-100 px-3 py-2 text-xs text-accent-600">
          {t("promoNote", {
            promo: tb("promoLabel", { percent: TOPUP_PROMO.percentOff }),
          })}
        </p>
      )}
      {items.length === 0 ? (
        <EmptyState icon={<CircleCheck />} title={t("noPendingPayments")} />
      ) : (
        <AdminPaymentQueue initialItems={items} initialCursor={page.nextCursor} />
      )}
    </Card>
  );
}
