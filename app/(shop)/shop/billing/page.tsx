import { Receipt } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { SyncDailyFeesUseCase } from "@/src/application/use-cases/billing/DailyFeeUseCases";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { DailyFeePanel } from "@/src/presentation/components/billing/DailyFeePanel";
import { PaymentHistoryList } from "@/src/presentation/components/billing/PaymentHistoryList";
import { TopupHistoryList } from "@/src/presentation/components/billing/TopupHistoryList";
import { ContactAdminButton } from "@/src/presentation/components/shop/ContactAdminButton";

export const dynamic = "force-dynamic";

/**
 * Order-threshold daily fee billing. The old day-based top-up flow is retired:
 * no top-up form, its history stays readable under "legacy".
 */
export default async function ShopBillingPage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("shopPages");
  const overview = await new SyncDailyFeesUseCase(
    container.dailyFeeRepository,
    container.orderRepository,
    container.shopRepository,
  ).execute(shopId);
  const paymentsPage = await container.paymentRepository.pageByShop(shopId);
  const topupsPage = await container.topupTransactionRepository.pageByShop(shopId);

  return (
    <div className="flex flex-col gap-4">
      <DailyFeePanel overview={overview} />

      {(topupsPage.items.length > 0 || paymentsPage.items.length > 0) && (
        <Card>
          <CardHeader title={t("legacyBillingTitle")} subtitle={t("legacyBillingSubtitle")} />
          {topupsPage.items.length > 0 && (
            <TopupHistoryList initialItems={topupsPage.items} initialCursor={topupsPage.nextCursor} />
          )}
          {paymentsPage.items.length === 0 ? (
            <EmptyState icon={<Receipt />} title={t("noPaymentHistory")} />
          ) : (
            <PaymentHistoryList initialItems={paymentsPage.items} initialCursor={paymentsPage.nextCursor} />
          )}
        </Card>
      )}

      <Card>
        <CardHeader title={t("paymentProblemTitle")} subtitle={t("paymentProblemSubtitle")} />
        <ContactAdminButton />
      </Card>
    </div>
  );
}
