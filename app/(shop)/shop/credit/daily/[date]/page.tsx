import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { DailySettlementDetail } from "@/src/presentation/components/credit/CreditDailyBits";

export const dynamic = "force-dynamic";

export default async function ShopCreditDailyDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { shopId } = await requireShopAccess();
  const { date } = await params;
  const t = await getTranslations("credit");
  const s = await container.creditRepository.findSettlement(shopId, date);
  if (!s) notFound();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/shop/credit/daily" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <Card>
        <CardHeader title={t("dailyDetailTitle", { date })} />
        <DailySettlementDetail s={s} ledgerHref={s.ledgerEntryId ? `/shop/credit/${s.ledgerEntryId}` : null} />
      </Card>
    </div>
  );
}
