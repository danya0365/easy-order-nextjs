import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { shopCreditStatus } from "@/src/infrastructure/request/credit";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Pager, pageParam, CREDIT_PAGE_SIZE } from "@/src/presentation/components/credit/CreditBits";
import { CreditTodayCard, DailySettlementList } from "@/src/presentation/components/credit/CreditDailyBits";

export const dynamic = "force-dynamic";

export default async function ShopCreditDailyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { shopId } = await requireShopAccess();
  const status = await shopCreditStatus(shopId);
  if (!status.enabled) notFound();
  const sp = await searchParams;
  const t = await getTranslations("credit");
  const [today, list] = await Promise.all([
    container.creditService.getTodayProgress(shopId),
    container.creditService.pageSettlements(shopId, pageParam(sp.page), CREDIT_PAGE_SIZE),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <Link href="/shop/credit" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <h1 className="text-xl font-bold text-foreground">{t("dailyTitle")}</h1>
      {today && <CreditTodayCard p={today} />}
      <Card>
        <CardHeader title={t("dailyHistory")} subtitle={t("dailySubtitle")} />
        <DailySettlementList items={list.items} hrefFor={(s) => `/shop/credit/daily/${s.businessDate}`} />
        <Pager basePath="/shop/credit/daily" page={list.page} total={list.total} pageSize={list.pageSize} />
      </Card>
    </div>
  );
}
