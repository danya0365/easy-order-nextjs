import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { CrmAccess } from "@/src/infrastructure/auth/crm-access";
import { crmCan, type CrmPerm } from "@/src/domain/services/crm-permissions";
import { container } from "@/src/infrastructure/di/container";
import { renderQrDataUrl } from "@/src/infrastructure/services/qr";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { Card } from "@/src/presentation/components/ui/Card";
import { StatCard } from "@/src/presentation/components/ui/StatCard";
import { CustomerDetailActions } from "@/src/presentation/components/shop/CustomerDetailActions";
import { PendingMemberActions } from "@/src/presentation/components/shop/PendingMemberActions";
import { maskPhone, signupChannel } from "@/src/domain/services/customer-crm";
import { satangToBaht } from "@/src/presentation/lib/money";
import { formatDate, formatDateTime } from "@/src/presentation/lib/format-date";

const PAGE_SIZE = 10;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Shop-scoped existence check; call before rendering so notFound() sets a real 404. */
export async function loadCrmCustomerOr404(shopId: string, id: string) {
  if (!ID_RE.test(id)) notFound();
  const customer = await container.customerRepository.findById(shopId, id);
  if (!customer) notFound();
  return customer;
}

/** Customer CRM detail — shared by /shop/customers/[id] and /staff/customers/[id]. */
export async function CustomerDetailView({
  access,
  id,
  sp,
}: {
  access: CrmAccess;
  id: string;
  sp: Record<string, string | undefined>;
}) {
  const { shopId, role, base } = access;
  // Shop-scoped lookup: another shop's customer id 404s.
  const customer = await loadCrmCustomerOr404(shopId, id);
  const can = (p: CrmPerm) => crmCan(role, p);
  const shownPhone = access.fullPhone || role === "owner" ? customer.phone : maskPhone(customer.phone);

  const t = await getTranslations("customerDetail");
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const crm = container.customerCrmRepository;
  const [stats, orders, addresses, ledger, timeline, balance, rewards, qr, reviewer] = await Promise.all([
    crm.detailStats(shopId, customer.id),
    crm.pageOrders(shopId, customer.id, page, PAGE_SIZE),
    crm.deliveryAddresses(shopId, customer.id),
    crm.ledger(shopId, customer.id, 30),
    crm.timeline(shopId, customer.id, 30),
    container.loyaltyPointsBalanceRepository.findByCustomer(shopId, customer.id),
    container.loyaltyPointsRewardRepository.listByShop(shopId, { activeOnly: true }),
    renderQrDataUrl(customer.publicCode),
    customer.onlineOrderReviewedBy ? container.userRepository.findById(customer.onlineOrderReviewedBy) : null,
  ]);
  const actorIds = [...new Set(timeline.map((e) => e.actorUserId).filter((x): x is string => !!x))].slice(0, 20);
  const actors = new Map(
    (await Promise.all(actorIds.map((a) => container.userRepository.findById(a)))).filter(Boolean).map((u) => [u!.id, u!.email]),
  );
  const pages = Math.max(1, Math.ceil(orders.total / PAGE_SIZE));
  const blocked = !!customer.blockedAt;
  const channel = signupChannel(customer);
  const fTotal = stats.fulfillment.pickup + stats.fulfillment.delivery + stats.fulfillment.dine_in;
  const pct = (n: number) => (fTotal ? Math.round((n / fTotal) * 100) : 0);
  const status = blocked ? "blocked" : customer.onlineOrderStatus;

  return (
    <div className="flex flex-col gap-4">
      <Link href={`${base}/customers`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t("back")}
      </Link>

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground break-words">{customer.displayName || t("noName")}</h1>
          {role === "owner" ? (
            <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1 text-sm text-brand-600">
              <Phone className="size-4" />
              {shownPhone}
            </a>
          ) : (
            <p className="text-sm text-muted">{shownPhone}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge tone={blocked ? "danger" : status === "approved" ? "success" : status === "pending" ? "warning" : "neutral"}>
              {t(`status_${status}` as "status_none")}
            </Badge>
            <Badge>{t(`channel_${channel}` as "channel_static")}</Badge>
            {(customer.tags ?? []).map((tag) => (
              <Badge key={tag} tone="brand">{tag === "vip" ? t("tag_vip") : tag === "regular" ? t("tag_regular") : tag}</Badge>
            ))}
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted">{t("signedUp")}</dt>
            <dd>{formatDate(customer.createdAt)}</dd>
            <dt className="text-muted">{t("publicCode")}</dt>
            <dd className="font-mono">{customer.publicCode}</dd>
            {customer.onlineOrderReviewedAt && (
              <>
                <dt className="text-muted">{t("reviewed")}</dt>
                <dd>
                  {formatDateTime(customer.onlineOrderReviewedAt)}
                  {reviewer ? ` · ${reviewer.email}` : ""}
                </dd>
              </>
            )}
            {customer.blockedAt && (
              <>
                <dt className="text-muted">{t("blockedAt")}</dt>
                <dd>{formatDateTime(customer.blockedAt)}</dd>
              </>
            )}
          </dl>
          {customer.note && (
            <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 break-words">{customer.note}</p>
          )}
          {customer.onlineOrderStatus === "pending" && !blocked && can("approve") && (
            <div className="mt-2">
              <PendingMemberActions customerId={customer.id} canBlock={can("block")} />
            </div>
          )}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt={t("qrAlt")} className="size-32 self-center rounded-lg border border-border sm:self-start" />
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t("orders")} value={stats.orderCount} />
        <StatCard label={t("spend")} value={satangToBaht(stats.totalSpendSatang)} />
        <StatCard label={t("avgTicket")} value={satangToBaht(stats.avgTicketSatang)} />
        <StatCard label={t("points")} value={balance?.currentPoints ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted">{t("firstOrder")}</p>
              <p>{stats.firstOrderAt ? formatDate(stats.firstOrderAt) : "—"}</p>
              <p className="mt-2 text-muted">{t("lastOrder")}</p>
              <p>{stats.lastOrderAt ? formatDate(stats.lastOrderAt) : "—"}</p>
            </div>
            <div>
              <p className="text-muted">{t("topItems")}</p>
              {stats.topItems.length === 0 ? (
                <p>—</p>
              ) : (
                <ol className="list-decimal pl-4">
                  {stats.topItems.map((i) => (
                    <li key={i.name} className="break-words">
                      {i.name} ×{i.quantity}
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div>
              <p className="text-muted">{t("fulfillSplit")}</p>
              <p>{t("pickup")} {stats.fulfillment.pickup} ({pct(stats.fulfillment.pickup)}%)</p>
              <p>{t("delivery")} {stats.fulfillment.delivery} ({pct(stats.fulfillment.delivery)}%)</p>
              {stats.fulfillment.dine_in > 0 && <p>{t("dineIn")} {stats.fulfillment.dine_in} ({pct(stats.fulfillment.dine_in)}%)</p>}
            </div>
          </Card>

          <Card className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">{t("orderHistory", { n: orders.total })}</h2>
            {orders.items.length === 0 ? (
              <p className="text-sm text-muted">{t("noOrders")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {orders.items.map((o) => (
                  <li key={o.id}>
                    {base === "/shop" ? (
                    <Link href={`/shop/orders/${o.id}`} className="flex items-center justify-between gap-2 py-2 text-sm hover:bg-muted-surface">
                      <span className="min-w-0">
                        <span className="font-semibold">#{o.orderNo}</span>{" "}
                        <span className="text-muted">{formatDateTime(o.createdAt)}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge tone={o.status === "cancelled" ? "danger" : o.status === "completed" ? "success" : "warning"}>
                          {t(`ostatus_${o.status}` as "ostatus_pending")}
                        </Badge>
                        <span>{satangToBaht(o.totalSatang)}</span>
                      </span>
                    </Link>
                    ) : (
                    <div className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="font-semibold">#{o.orderNo}</span>{" "}
                        <span className="text-muted">{formatDateTime(o.createdAt)}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge tone={o.status === "cancelled" ? "danger" : o.status === "completed" ? "success" : "warning"}>
                          {t(`ostatus_${o.status}` as "ostatus_pending")}
                        </Badge>
                        <span>{satangToBaht(o.totalSatang)}</span>
                      </span>
                    </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {pages > 1 && (
              <div className="flex items-center justify-between text-sm">
                {page > 1 ? (
                  <Link href={`?page=${page - 1}`} className="inline-flex items-center gap-1 text-brand-600"><ChevronLeft className="size-4" />{t("prev")}</Link>
                ) : <span />}
                <span className="text-muted">{page} / {pages}</span>
                {page < pages ? (
                  <Link href={`?page=${page + 1}`} className="inline-flex items-center gap-1 text-brand-600">{t("next")}<ChevronRight className="size-4" /></Link>
                ) : <span />}
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">{t("ledger")}</h2>
            {ledger.length === 0 ? (
              <p className="text-sm text-muted">{t("noLedger")}</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {ledger.map((l) => (
                  <li key={l.id} className="flex items-start justify-between gap-2 py-2">
                    <span className="min-w-0">
                      <Badge tone={l.type === "earn" ? "success" : l.type === "redeem" ? "brand" : "warning"}>{t(`tx_${l.type}` as "tx_earn")}</Badge>{" "}
                      <span className="break-words">{l.note ?? ""}</span>
                      <span className="block text-xs text-muted">{formatDateTime(l.createdAt)}</span>
                    </span>
                    <span className={`shrink-0 font-semibold ${l.quantity < 0 ? "text-error" : "text-green-700"}`}>
                      {l.quantity > 0 ? `+${l.quantity}` : l.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">{t("addresses")}</h2>
            {addresses.length === 0 ? (
              <p className="text-sm text-muted">{t("noAddresses")}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {addresses.map((a) => (
                  <li key={a.address} className="flex gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
                    <span className="min-w-0 break-words">
                      {a.address}
                      <span className="block text-xs text-muted">{t("addrUsed", { n: a.count, date: formatDate(a.lastUsedAt) })}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">{t("timeline")}</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {timeline.map((e) => (
                <li key={e.id} className="border-l-2 border-border pl-3">
                  <p>{t.has(`act.${e.action}` as never) ? t(`act.${e.action}` as never) : e.action}</p>
                  <p className="text-xs text-muted">
                    {formatDateTime(e.createdAt)}
                    {e.actorUserId ? ` · ${actors.get(e.actorUserId) ?? "—"}` : ""}
                  </p>
                </li>
              ))}
              {customer.onlineOrderRequestedAt && (
                <li className="border-l-2 border-border pl-3">
                  <p>{t("evRequested")}</p>
                  <p className="text-xs text-muted">{formatDateTime(customer.onlineOrderRequestedAt)}</p>
                </li>
              )}
              <li className="border-l-2 border-border pl-3">
                <p>{t("evCreated")}</p>
                <p className="text-xs text-muted">{formatDateTime(customer.createdAt)}</p>
              </li>
            </ul>
          </Card>
        </div>

        <CustomerDetailActions
          customerId={customer.id}
          phone={role === "owner" ? customer.phone : ""}
          perms={{
            editName: can("editName"),
            note: can("note"),
            tags: can("tags"),
            points: can("points"),
            redeem: can("redeem"),
            block: can("block"),
            newMember: can("newMember"),
            resetDevices: can("resetDevices"),
            pdpa: can("pdpa"),
          }}
          displayName={customer.displayName ?? ""}
          note={customer.note ?? ""}
          tags={customer.tags ?? []}
          blocked={blocked}
          newMemberCleared={!!customer.newMemberClearedAt}
          showNewMember={channel === "static"}
          rewards={rewards.map((r) => ({ id: r.id, name: r.name, pointsCost: r.pointsCost }))}
        />
      </div>
    </div>
  );
}
