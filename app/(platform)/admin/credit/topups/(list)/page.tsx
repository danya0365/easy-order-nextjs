import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import type { CreditTopupStatus } from "@/src/application/repositories/ICreditRepository";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { CREDIT_PAGE_SIZE, Pager, TopupStatusBadge, pageParam } from "@/src/presentation/components/credit/CreditBits";
import { satangToBaht } from "@/src/presentation/lib/money";
import { formatDateTime } from "@/src/presentation/lib/format-date";

export const dynamic = "force-dynamic";

const STATUSES: CreditTopupStatus[] = ["pending", "approved", "rejected"];

export default async function AdminCreditTopupsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole("platform_admin");
  const t = await getTranslations("credit");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as CreditTopupStatus) ? (sp.status as CreditTopupStatus) : null;
  const page = pageParam(sp.page);
  const [list, shops] = await Promise.all([
    container.creditRepository.pageTopups({ page, pageSize: CREDIT_PAGE_SIZE, status }),
    container.shopRepository.list(),
  ]);
  const name = new Map(shops.map((s) => [s.id, s.name]));
  const chip = (on: boolean) => `whitespace-nowrap rounded-full px-3 py-1 text-xs ring-1 ${on ? "bg-brand-500 text-on-brand ring-brand-500" : "text-foreground ring-border hover:bg-muted-surface"}`;
  const label = { pending: t("statusPending"), approved: t("statusApproved"), rejected: t("statusRejected") };
  return (
    <Card>
      <CardHeader title={t("topups")} />
      <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
        <Link href="/admin/credit/topups" className={chip(!status)}>{t("filterAll")}</Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/credit/topups?status=${s}`} className={chip(status === s)}>{label[s]}</Link>
        ))}
      </div>
      {list.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{t("noTopups")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border" data-testid="credit-topups">
          {list.items.map((x) => (
            <li key={x.id}>
              <Link href={`/admin/credit/topups/${x.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-muted-surface/50">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{name.get(x.shopId) ?? x.shopId}</span>
                  <span className="block truncate text-xs text-muted">฿{satangToBaht(x.amountSatang)}{x.bonusSatang > 0 ? ` +${satangToBaht(x.bonusSatang)}` : ""} · {formatDateTime(x.createdAt)}</span>
                </span>
                <TopupStatusBadge status={x.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager basePath="/admin/credit/topups" page={list.page} total={list.total} pageSize={list.pageSize} params={{ status: status ?? undefined }} />
    </Card>
  );
}
