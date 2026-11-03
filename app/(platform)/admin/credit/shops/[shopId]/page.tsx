import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { CREDIT_ENTRY_TYPES, type CreditEntryType } from "@/src/domain/services/credit";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { CreditDashCardAdmin } from "@/src/presentation/components/credit/CreditAdminBits";
import { CreditLedgerList, CreditRuleSummary, CREDIT_PAGE_SIZE, LedgerTypeFilter, Pager, pageParam } from "@/src/presentation/components/credit/CreditBits";
import { CreditAdjustForm } from "@/src/presentation/components/credit/CreditAdjustForm";
import { CreditOverrideForm } from "@/src/presentation/components/credit/CreditConfigForm";
import { CreditSettleDayForm } from "@/src/presentation/components/credit/CreditSettleDayForm";
import { DailySettlementList } from "@/src/presentation/components/credit/CreditDailyBits";
import { addDaysYmd, creditDayOf } from "@/src/domain/services/credit";

export const dynamic = "force-dynamic";

export default async function AdminCreditShopPage({ params, searchParams }: { params: Promise<{ shopId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole("platform_admin");
  const { shopId } = await params;
  const sp = await searchParams;
  const t = await getTranslations("credit");
  const shop = await container.shopRepository.findById(shopId);
  if (!shop) notFound();
  const page = pageParam(sp.page);
  const typeRaw = typeof sp.type === "string" ? sp.type : null;
  const type = CREDIT_ENTRY_TYPES.includes(typeRaw as CreditEntryType) ? (typeRaw as CreditEntryType) : null;
  const [status, platform, override, ledger, daily] = await Promise.all([
    container.creditService.getStatus(shopId, { withBalance: true }),
    container.creditService.getPlatformConfig(),
    container.creditService.getShopOverride(shopId),
    container.creditRepository.pageLedger(shopId, { page, pageSize: CREDIT_PAGE_SIZE, type }),
    container.creditService.pageSettlements(shopId, 1, 5),
  ]);
  const yesterday = addDaysYmd(creditDayOf(new Date(), "00:00"), -1);
  const base = `/admin/credit/shops/${shopId}`;
  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/credit" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <h1 className="text-xl font-bold text-foreground">{t("ledgerOf", { name: shop.name })}</h1>
      <CreditDashCardAdmin status={status} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("adjustTitle")} />
          <CreditAdjustForm shopId={shopId} />
        </Card>
        <Card>
          <CardHeader title={t("ruleTitle")} />
          <CreditRuleSummary config={status.config} />
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("settleTitle")} />
          <CreditSettleDayForm shopId={shopId} defaultDate={yesterday} />
        </Card>
        <Card>
          <CardHeader title={t("dailyTitle")} />
          <DailySettlementList items={daily.items} hrefFor={(s) => `${base}/daily/${s.businessDate}`} />
          <Link href={`${base}/daily`} className="mt-3 inline-block text-sm text-brand-600 underline" data-testid="daily-all">{t("dailyViewAll", { n: daily.total })}</Link>
        </Card>
      </div>
      <Card>
        <CardHeader title={t("overrideTitle")} />
        <CreditOverrideForm shopId={shopId} platform={platform} override={override} />
      </Card>
      <Card>
        <CardHeader title={t("ledgerTitle")} />
        <LedgerTypeFilter basePath={base} current={type} />
        <CreditLedgerList items={ledger.items} hrefFor={(e) => `/admin/credit/tx/${e.id}`} />
        <Pager basePath={base} page={ledger.page} total={ledger.total} pageSize={ledger.pageSize} params={{ type: type ?? undefined }} />
      </Card>
    </div>
  );
}
