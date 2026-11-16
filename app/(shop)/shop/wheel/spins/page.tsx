import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import type { SpinResultFilter } from "@/src/application/repositories/ILuckyWheelRepository";
import { formatDateTime } from "@/src/presentation/lib/format-date";
import { Pager, pageParam } from "@/src/presentation/components/credit/CreditBits";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { PrizeIcon } from "@/src/presentation/components/wheel/LuckyWheel";
import { RewardStatusBadge, wheelPrizeKind } from "@/src/presentation/components/wheel/RewardBits";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function ShopWheelSpinsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const { shopId } = await requireShopAccess();
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const status = sp.status === "pending" || sp.status === "redeemed" ? sp.status : undefined;
  const filter: SpinResultFilter = status ? { rewardStatus: status } : {};
  const [t, { items, total }] = await Promise.all([
    getTranslations("wheel"),
    container.luckyWheelRepository.pageResults(shopId, filter, page, PAGE_SIZE),
  ]);
  const customers = new Map(
    (await Promise.all([...new Set(items.map((r) => r.customerId))].map((id) => container.customerRepository.findById(shopId, id))))
      .filter((c) => !!c)
      .map((c) => [c!.id, c!]),
  );
  const tabs = [
    { key: undefined, label: t("filterAll") },
    { key: "pending", label: t("filterPending") },
    { key: "redeemed", label: t("filterRedeemed") },
  ];

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 pb-24">
      <Link href="/shop/wheel" className="inline-flex items-center gap-1 text-sm font-semibold text-muted">
        <ArrowLeft className="size-4" />
        {t("backToWheel")}
      </Link>
      <h1 className="text-xl font-bold text-foreground">{t("spinsTitle")}</h1>
      <div className="flex gap-2 text-sm">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.key ? `/shop/wheel/spins?status=${tab.key}` : "/shop/wheel/spins"}
            className={`rounded-full px-3 py-1.5 font-medium ${status === tab.key ? "bg-brand-500 text-on-brand" : "bg-muted-surface text-muted"}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState title={t("noSpins")} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card" data-testid="wheel-spins-list">
          {items.map((r) => {
            const c = customers.get(r.customerId);
            return (
              <li key={r.id}>
                <Link href={`/shop/wheel/spins/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted-surface">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <PrizeIcon type={wheelPrizeKind(r.prizeType)} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{r.prizeName}</span>
                    <span className="block truncate text-xs text-muted">
                      {(c?.displayName || c?.phone || "-") + " · " + formatDateTime(r.createdAt)}
                    </span>
                  </span>
                  <RewardStatusBadge result={r} />
                  <ChevronRight className="size-4 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Pager basePath="/shop/wheel/spins" page={page} total={total} pageSize={PAGE_SIZE} params={{ status }} />
    </main>
  );
}
