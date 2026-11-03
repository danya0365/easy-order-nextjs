import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Pager, pageParam, CREDIT_PAGE_SIZE } from "@/src/presentation/components/credit/CreditBits";
import { DailySettlementList } from "@/src/presentation/components/credit/CreditDailyBits";

export const dynamic = "force-dynamic";

export default async function AdminCreditDailyPage({ params, searchParams }: { params: Promise<{ shopId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole("platform_admin");
  const { shopId } = await params;
  const sp = await searchParams;
  const t = await getTranslations("credit");
  const [shop, list] = await Promise.all([
    container.shopRepository.findById(shopId),
    container.creditService.pageSettlements(shopId, pageParam(sp.page), CREDIT_PAGE_SIZE),
  ]);
  const base = `/admin/credit/shops/${shopId}/daily`;
  return (
    <div className="flex flex-col gap-4">
      <Link href={`/admin/credit/shops/${shopId}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <h1 className="text-xl font-bold text-foreground">{t("dailyTitleOf", { name: shop?.name ?? "" })}</h1>
      <Card>
        <CardHeader title={t("dailyTitle")} subtitle={t("dailySubtitle")} />
        <DailySettlementList items={list.items} hrefFor={(s) => `${base}/${s.businessDate}`} />
        <Pager basePath={base} page={list.page} total={list.total} pageSize={list.pageSize} />
      </Card>
    </div>
  );
}
