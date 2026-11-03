import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { SyncDailyFeesUseCase } from "@/src/application/use-cases/billing/DailyFeeUseCases";
import { markDailyFeePaidAction } from "@/src/presentation/actions/admin-actions";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { DailyFeePanel } from "@/src/presentation/components/billing/DailyFeePanel";
import { ShopCutoffForm } from "@/src/presentation/components/admin/ShopCutoffForm";

export const dynamic = "force-dynamic";

export default async function AdminShopBillingPage({ params }: { params: Promise<{ shopId: string }> }) {
  await requireRole("platform_admin");
  const { shopId } = await params;
  const t = await getTranslations("dailyFee");
  const shop = await container.shopRepository.findById(shopId);
  if (!shop) notFound();
  const settings = await container.platformSettingsRepository.get();
  const overview = await new SyncDailyFeesUseCase(
    container.dailyFeeRepository,
    container.orderRepository,
    container.shopRepository,
    () => container.creditService.isMasterEnabled(),
  ).execute(shopId);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/shops" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="size-4" /> {t("backToShops")}
      </Link>
      <h1 className="text-xl font-semibold text-foreground">{t("adminShopTitle", { name: shop.name })}</h1>
      <Card>
        <CardHeader title={t("cutoffOverrideTitle")} />
        <ShopCutoffForm shopId={shopId} cutoff={overview.cutoffOverride} platformDefault={settings.defaultCutoffTime} />
      </Card>
      <DailyFeePanel overview={overview} markPaid={{ action: markDailyFeePaidAction, shopId }} />
    </div>
  );
}
