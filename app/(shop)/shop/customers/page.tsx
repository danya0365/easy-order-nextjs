import Link from "next/link";
import { Clock, Coins, Search, UserPlus, Users, UserX } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card } from "@/src/presentation/components/ui/Card";
import { Input } from "@/src/presentation/components/ui/Input";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { RejectSuspiciousButton } from "@/src/presentation/components/shop/PendingMemberActions";
import { CustomerCrmList, type CrmListItem } from "@/src/presentation/components/shop/CustomerCrmList";
import { ListPendingMemberRequestsUseCase } from "@/src/application/use-cases/member/ListPendingMemberRequestsUseCase";
import {
  CRM_TABS,
  inTab,
  maskPhone,
  normalizeQuery,
  queryCrm,
  signupChannel,
  summarize,
} from "@/src/domain/services/customer-crm";
import { satangToBaht } from "@/src/presentation/lib/money";
import { formatDate } from "@/src/presentation/lib/format-date";

export const dynamic = "force-dynamic";

const RENDER_LIMIT = 200;
const field = "rounded-lg border border-border bg-surface px-3 py-2 text-sm";

export default async function ShopCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const query = normalizeQuery(sp);
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("customersCrm");
  const tp = await getTranslations("shopPages");

  // Expire stale pending first (same as before), then one aggregate query.
  const pendingReqs = await new ListPendingMemberRequestsUseCase(
    container.customerRepository,
    container.memberSignupGuardRepository,
  ).execute(shopId);
  const rows = await container.customerCrmRepository.listWithStats(shopId);
  const now = Date.now();
  const summary = summarize(rows, now);
  const result = queryCrm(rows, query, now);
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
  const tabCount = Object.fromEntries(CRM_TABS.map((tab) => [tab, rows.filter((r) => inTab(r, tab, now)).length]));

  const items: CrmListItem[] = result.slice(0, RENDER_LIMIT).map((c) => ({
    id: c.id,
    name: c.displayName,
    phone: c.phone,
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
    const merged = { tab: query.tab, q: query.q, channel: query.channel, sort: query.sort, ...over };
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
        {query.tab === "pending" && flags.size > 0 ? (
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm text-warning">{tp("pendingSuspiciousCount", { count: flags.size })}</p>
            <RejectSuspiciousButton />
          </div>
        ) : null}
        <p className="mb-1 text-xs text-muted">
          {t("showing", { n: items.length, total: result.length })}
          {result.length > RENDER_LIMIT ? ` · ${t("limitNote", { limit: RENDER_LIMIT })}` : ""}
        </p>
        {items.length === 0 ? (
          <EmptyState icon={<Users />} title={t("empty")} />
        ) : (
          <CustomerCrmList items={items} exportQuery={qs({})} />
        )}
      </Card>
    </div>
  );
}
