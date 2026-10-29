import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, Coins, Search, UserPlus, Users, UserX } from "lucide-react";
import { BULK_MAX } from "@/src/application/use-cases/customer/CustomerCrmUseCases";
import { getTranslations } from "next-intl/server";

import type { CrmAccess } from "@/src/infrastructure/auth/crm-access";
import { crmCan } from "@/src/domain/services/crm-permissions";
import { container } from "@/src/infrastructure/di/container";
import { Card } from "@/src/presentation/components/ui/Card";
import { Input } from "@/src/presentation/components/ui/Input";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { RejectSuspiciousButton } from "@/src/presentation/components/shop/PendingMemberActions";
import { CustomerCrmList, type CrmListItem } from "@/src/presentation/components/shop/CustomerCrmList";
import { ListPendingMemberRequestsUseCase } from "@/src/application/use-cases/member/ListPendingMemberRequestsUseCase";
import {
  CRM_PAGE_SIZES,
  CRM_TABS,
  maskPhone,
  normalizePageSize,
  normalizeQuery,
  signupChannel,
} from "@/src/domain/services/customer-crm";
import { satangToBaht } from "@/src/presentation/lib/money";
import { formatDate } from "@/src/presentation/lib/format-date";

const field = "rounded-lg border border-border bg-surface px-3 py-2 text-sm";

/** Customers CRM list — shared by /shop/customers (owner) and /staff/customers (staff). */
export async function CustomersListView({
  access,
  sp,
}: {
  access: CrmAccess;
  sp: Record<string, string | undefined>;
}) {
  const { shopId, role, base } = access;
  const query = normalizeQuery(sp);
  const size = normalizePageSize(sp.size);
  const reqPage = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const t = await getTranslations("customersCrm");
  const tp = await getTranslations("shopPages");

  // Expire stale pending first (same as before), then one aggregate query.
  const pendingReqs = await new ListPendingMemberRequestsUseCase(
    container.customerRepository,
    container.memberSignupGuardRepository,
  ).execute(shopId);
  const now = Date.now();
  const [overview, firstTry] = await Promise.all([
    container.customerCrmRepository.overview(shopId, now),
    container.customerCrmRepository.searchPage(shopId, query, { page: reqPage, size, now }),
  ]);
  const pages = Math.max(1, Math.ceil(firstTry.total / size));
  // Out-of-range page (e.g. after a filter change) -> clamp to the last page.
  const result =
    reqPage > pages && firstTry.total > 0
      ? await container.customerCrmRepository.searchPage(shopId, query, { page: pages, size, now })
      : firstTry;
  const summary = overview.summary;
  const tabCount = overview.tabs;
  const flags = new Map(
    pendingReqs
      .filter((r) => r.suspicious)
      .map((r) => [
        r.customer.id,
        [r.flags.sameIp ? tp("flagSameIp") : null, r.flags.previouslyRejected ? tp("flagPrevRejected") : null, r.flags.multiDevice ? tp("flagMultiDevice") : null]
          .filter(Boolean)
          .join(" · "),
      ]),
  );

  const items: CrmListItem[] = result.items.map((c) => ({
    id: c.id,
    name: c.displayName,
    phone: role === "owner" ? c.phone : "",
    maskedPhone: maskPhone(c.phone),
    orderCount: c.orderCount,
    spend: satangToBaht(c.totalSpendSatang),
    lastOrder: c.lastOrderAt ? formatDate(c.lastOrderAt) : null,
    points: c.points,
    pending: c.onlineOrderStatus === "pending" && !c.blockedAt,
    blocked: !!c.blockedAt,
    vip: c.tags.includes("vip"),
    tags: c.tags,
    channel: signupChannel(c),
    hasNote: !!c.note?.trim(),
    flags: flags.get(c.id) ?? null,
  }));

  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams();
    const merged = { tab: query.tab, q: query.q, channel: query.channel, sort: query.sort, size: size === 25 ? "" : String(size), ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return p.toString();
  };

  const cards = [
    { label: t("sumTotal"), value: summary.total, icon: Users },
    { label: t("sumNew"), value: summary.newThisMonth, icon: UserPlus },
    { label: t("sumPending"), value: summary.pending, icon: Clock, href: `?${qs({ tab: "pending" })}` },
    { label: t("sumLapsed"), value: summary.lapsed, icon: UserX, href: `?${qs({ tab: "lapsed" })}` },
    { label: t("sumPoints"), value: summary.outstandingPoints.toLocaleString("th-TH"), icon: Coins },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {cards.map(({ label, value, icon: Icon, href }) => {
          const inner = (
            <Card className="flex h-full flex-col gap-1 p-3">
              <span className="flex items-center gap-1 text-xs text-muted">
                <Icon className="size-3.5" />
                {label}
              </span>
              <span className="text-xl font-semibold text-foreground">{value}</span>
            </Card>
          );
          return href ? <Link key={label} href={href}>{inner}</Link> : <div key={label}>{inner}</div>;
        })}
      </div>

      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {CRM_TABS.map((tab) => (
          <Link
            key={tab}
            href={`?${qs({ tab })}`}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${query.tab === tab ? "border-brand-500 bg-brand-50 text-brand-700" : "border-border text-muted"}`}
          >
            {t(`tab_${tab}`)} ({tabCount[tab]})
          </Link>
        ))}
      </nav>

      <Card>
        <form method="get" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input type="hidden" name="tab" value={query.tab} />
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input name="q" defaultValue={query.q} className="pl-9" placeholder={t("searchPlaceholder")} />
          </div>
          <div className="flex gap-2">
            <select name="channel" defaultValue={query.channel} className={field} aria-label={t("channel")}>
              <option value="">{t("channelAll")}</option>
              <option value="static">{t("channelStatic")}</option>
              <option value="instore">{t("channelInstore")}</option>
            </select>
            <select name="size" defaultValue={String(size)} className={field} aria-label={t("pageSize")}>
              {CRM_PAGE_SIZES.map((n) => (
                <option key={n} value={n}>{t("perPage", { n })}</option>
              ))}
            </select>
            <select name="sort" defaultValue={query.sort} className={field} aria-label={t("sort")}>
              <option value="recent">{t("sortRecent")}</option>
              <option value="spend">{t("sortSpend")}</option>
              <option value="orders">{t("sortOrders")}</option>
              <option value="lastOrder">{t("sortLastOrder")}</option>
              <option value="points">{t("sortPoints")}</option>
            </select>
            <button className="rounded-lg bg-brand-600 px-3 py-2 text-sm text-on-brand">{t("apply")}</button>
          </div>
        </form>
      </Card>

      <Card>
        {query.tab === "pending" && flags.size > 0 && crmCan(role, "rejectSuspicious") ? (
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm text-warning">{tp("pendingSuspiciousCount", { count: flags.size })}</p>
            <RejectSuspiciousButton />
          </div>
        ) : null}
        <p className="mb-1 text-xs text-muted">
          {t("showingRange", {
            from: result.total === 0 ? 0 : (result.page - 1) * result.size + 1,
            to: (result.page - 1) * result.size + items.length,
            total: result.total,
          })}
        </p>
        {items.length === 0 ? (
          <EmptyState icon={<Users />} title={t("empty")} />
        ) : (
          <CustomerCrmList
            items={items}
            exportQuery={qs({})}
            query={{ tab: query.tab, q: query.q, channel: query.channel, sort: query.sort }}
            total={result.total}
            bulkMax={BULK_MAX}
            base={base}
            canBulkBlock={crmCan(role, "bulkBlock")}
            canApprove={crmCan(role, "approve")}
          />
        )}
        {pages > 1 && (
          <nav className="mt-3 flex items-center justify-between text-sm" aria-label={t("pagination")}>
            {result.page > 1 ? (
              <Link href={`?${qs({ page: String(result.page - 1) })}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2">
                <ChevronLeft className="size-4" />
                {t("prev")}
              </Link>
            ) : <span />}
            <span className="text-muted">{t("pageOf", { page: result.page, pages })}</span>
            {result.page < pages ? (
              <Link href={`?${qs({ page: String(result.page + 1) })}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2">
                {t("next")}
                <ChevronRight className="size-4" />
              </Link>
            ) : <span />}
          </nav>
        )}
      </Card>
    </div>
  );
}
