import { Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { shopCreditStatus } from "@/src/infrastructure/request/credit";
import { CREDIT_ENTRY_TYPES, type CreditEntryType } from "@/src/domain/services/credit";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { CreditDashCard } from "@/src/presentation/components/credit/CreditBalanceAlert";
import { CreditLedgerList, CreditRuleSummary, CREDIT_PAGE_SIZE, LedgerTypeFilter, Pager, TopupStatusBadge, pageParam } from "@/src/presentation/components/credit/CreditBits";
import { CreditTopupForm } from "@/src/presentation/components/credit/CreditTopupForm";
import { satangToBaht } from "@/src/presentation/lib/money";
import { formatDateTime } from "@/src/presentation/lib/format-date";

export const dynamic = "force-dynamic";

export default async function ShopCreditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("credit");
  const sp = await searchParams;
  const status = await shopCreditStatus(shopId);

  if (!status.enabled) {
    return (
      <Card>
        <EmptyState icon={<Wallet className="size-10 text-muted" />} title={t("notEnabledTitle")} description={t("notEnabledDesc")} />
      </Card>
    );
  }

  const page = pageParam(sp.page);
  const typeRaw = typeof sp.type === "string" ? sp.type : null;
  const type = CREDIT_ENTRY_TYPES.includes(typeRaw as CreditEntryType) ? (typeRaw as CreditEntryType) : null;
  const [ledger, topups] = await Promise.all([
    container.creditRepository.pageLedger(shopId, { page, pageSize: CREDIT_PAGE_SIZE, type }),
    container.creditRepository.pageTopups({ page: 1, pageSize: 5, shopId }),
  ]);
  const topup = status.config.topup;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </div>
      <CreditDashCard status={status} />
      <Card>
        <CardHeader title={t("ruleTitle")} />
        <CreditRuleSummary config={status.config} />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("topupTitle")} subtitle={t("topupDesc")} />
          <div id="topup">
            <CreditTopupForm packages={topup.packages} allowCustom={topup.allowCustom} minSatang={topup.minSatang} />
          </div>
        </Card>
        <Card>
          <CardHeader title={t("myTopups")} />
          {topups.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{t("noTopups")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border" data-testid="credit-my-topups">
              {topups.items.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium tabular-nums text-foreground">
                      ฿{satangToBaht(x.amountSatang)}
                      {x.bonusSatang > 0 && <span className="ml-1 text-xs text-success">+{satangToBaht(x.bonusSatang)}</span>}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {formatDateTime(x.createdAt)}
                      {x.rejectReason ? ` · ${x.rejectReason}` : ""}
                    </span>
                  </span>
                  <TopupStatusBadge status={x.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card>
        <CardHeader title={t("ledgerTitle")} />
        <LedgerTypeFilter basePath="/shop/credit" current={type} />
        <CreditLedgerList items={ledger.items} hrefFor={(e) => `/shop/credit/${e.id}`} />
        <Pager basePath="/shop/credit" page={ledger.page} total={ledger.total} pageSize={ledger.pageSize} params={{ type: type ?? undefined }} />
      </Card>
    </div>
  );
}
