import Link from "next/link";
import { Search, Settings, Inbox } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { CREDIT_PAGE_SIZE, Pager, pageParam } from "@/src/presentation/components/credit/CreditBits";
import { satangToBaht } from "@/src/presentation/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminCreditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole("platform_admin");
  const t = await getTranslations("credit");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const page = pageParam(sp.page);
  const [cfg, wallets, pending] = await Promise.all([
    container.creditService.getPlatformConfig(),
    container.creditRepository.pageWallets({ page, pageSize: CREDIT_PAGE_SIZE, q }),
    container.creditRepository.countPendingTopups(),
  ]);
  const warn = cfg.lowBalance.warnSatang;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/credit/settings" className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-sm text-foreground ring-1 ring-border hover:bg-muted-surface" data-testid="credit-settings-link">
          <Settings className="size-4" /> {t("settings")}
        </Link>
        <Link href="/admin/credit/topups?status=pending" className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-sm text-foreground ring-1 ring-border hover:bg-muted-surface">
          <Inbox className="size-4" /> {t("topups")}
          {pending > 0 && <span className="rounded-full bg-brand-500 px-1.5 text-xs font-bold text-on-brand">{t("pendingCount", { count: pending })}</span>}
        </Link>
      </div>
      <Card>
        <CardHeader title={t("adminTitle")} subtitle={t("adminSubtitle")} />
        {!cfg.enabled && <p className="mb-3 rounded-lg bg-warning-surface px-3 py-2 text-xs text-warning">{t("offNote")}</p>}
        <form className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <Search className="size-4 text-muted" />
          <input name="q" defaultValue={q} placeholder={t("search")} className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none" />
        </form>
        <ul className="flex flex-col divide-y divide-border" data-testid="credit-wallets">
          {wallets.items.map((w) => {
            const tone = w.balanceSatang <= 0 ? "text-error" : w.balanceSatang <= warn ? "text-warning" : "text-foreground";
            return (
              <li key={w.shopId}>
                <Link href={`/admin/credit/shops/${w.shopId}`} className="flex items-center justify-between gap-3 py-3 hover:bg-muted-surface/50">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{w.shopName}</span>
                    <span className="block truncate text-xs text-muted">/{w.shopSlug}</span>
                  </span>
                  <span className={`shrink-0 text-sm font-semibold tabular-nums ${tone}`}>฿{satangToBaht(w.balanceSatang)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <Pager basePath="/admin/credit" page={wallets.page} total={wallets.total} pageSize={wallets.pageSize} params={{ q: q || undefined }} />
      </Card>
    </div>
  );
}
