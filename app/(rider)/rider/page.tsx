import { Banknote, CheckCircle2, CircleAlert, Clock, Navigation, Package, Phone, Store } from "lucide-react";
import Link from "next/link";

import { formatOrderLineOptions } from "@/src/domain/services/menu-options";
import { orderNavigationUrl } from "@/src/domain/services/delivery-location";
import { needsCodCollection } from "@/src/domain/services/rider";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { GetRiderDashboardUseCase } from "@/src/application/use-cases/rider/RiderUseCases";
import { getRiderSession } from "@/src/infrastructure/auth/rider-session";
import { satangToBaht } from "@/src/presentation/lib/money";
import { RiderAutoRefresh } from "@/src/presentation/components/rider/RiderAutoRefresh";
import { RiderAvatar } from "@/src/presentation/components/rider/RiderAvatar";

const bigBtn =
  "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-4 text-lg font-bold";
const linkBtn =
  "inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 text-sm font-semibold text-foreground";

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`relative h-8 w-14 shrink-0 rounded-full transition ${on ? "bg-brand-500" : "bg-muted-surface ring-1 ring-border"}`}>
      <span className={`absolute top-1 size-6 rounded-full bg-card shadow ${on ? "right-1" : "left-1"}`} />
    </span>
  );
}

/** งาน tab: availability + active jobs from every shop of this device, with shop label + filter. */
export default async function RiderJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; msg?: string; shop?: string; joined?: string }>;
}) {
  const session = await getRiderSession();
  if (!session) return null;
  const { e, msg, shop: shopFilter, joined } = await searchParams;
  const t = await getTranslations("rider");
  const [dash, settings, phones] = await Promise.all([
    new GetRiderDashboardUseCase(container.orderRepository).execute(session, shopFilter ?? null),
    container.platformSettingsRepository.get(),
    Promise.all(
      session.memberships.map(async (m) => [
        m.shopId,
        (await container.shopProfileRepository.get(m.shopId).catch(() => null))?.phone ?? null,
      ] as const),
    ),
  ]);
  const shopPhone = new Map(phones);
  const { account } = session;
  const perShop = settings.riderAvailabilityMode === "per_shop";
  const multi = session.memberships.length > 1;
  const activeFilter = shopFilter && dash.shops.some((s) => s.shopId === shopFilter) ? shopFilter : null;
  const chip = (on: boolean) =>
    `inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${on ? "bg-brand-500 text-on-brand" : "bg-card text-foreground ring-1 ring-border"}`;

  return (
    <main className="flex flex-col gap-4 px-4 py-4">
      <RiderAutoRefresh seconds={30} />
      <header className="flex items-center gap-3">
        <RiderAvatar rider={{ id: session.memberships[0].rider.id, name: account.name, avatarUrl: account.avatarUrl ?? session.memberships[0].rider.avatarUrl }} size={44} />
        <div className="min-w-0">
          <p className="truncate text-xs text-muted" data-testid="rider-shop-names">
            {session.memberships.map((m) => m.shopName).join(" · ")}
          </p>
          <h1 className="truncate text-lg font-bold text-foreground">{account.name}</h1>
        </div>
      </header>

      {joined && (
        <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" data-testid="rider-joined">
          {t("joinedNotice")}
        </p>
      )}

      {perShop ? (
        session.memberships.map((m) => (
          <form key={m.shopId} method="post" action="/rider/availability" data-testid="rider-availability">
            <input type="hidden" name="shopId" value={m.shopId} />
            <input type="hidden" name="available" value={m.rider.available ? "0" : "1"} />
            <button role="switch" aria-checked={m.rider.available} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-card px-4 ring-1 ring-border">
              <span className="text-left text-base font-semibold text-foreground">
                {t("availAtShop", { shop: m.shopName, status: m.rider.available ? t("available") : t("busy") })}
              </span>
              <Toggle on={m.rider.available} />
            </button>
          </form>
        ))
      ) : (
        <form method="post" action="/rider/availability" data-testid="rider-availability">
          <input type="hidden" name="available" value={account.available ? "0" : "1"} />
          <button role="switch" aria-checked={account.available} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-card px-4 ring-1 ring-border">
            <span className="text-base font-semibold text-foreground">
              {t("rpStatusLabel", { status: account.available ? t("available") : t("busy") })}
            </span>
            <Toggle on={account.available} />
          </button>
        </form>
      )}

      {multi && (
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label={t("filterAll")} data-testid="rider-shop-filter">
          <Link href="/rider" className={chip(!activeFilter)}>
            {t("filterAll")}
          </Link>
          {dash.shops.map((s) => (
            <Link key={s.shopId} href={`/rider?shop=${encodeURIComponent(s.shopId)}`} className={chip(activeFilter === s.shopId)}>
              <Store className="size-4" /> {s.shopName}
              {s.openJobs > 0 && <span className="rounded-full bg-black/10 px-1.5 text-xs">{s.openJobs}</span>}
            </Link>
          ))}
        </nav>
      )}

      {e === "failed" && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="rider-error">
          <CircleAlert className="mt-0.5 size-4 shrink-0" /> {msg || t("rpFailed")}
        </p>
      )}
      {e === "link" && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t("linkGone")}</p>
      )}

      {dash.jobs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center" data-testid="rider-empty">
          <Package className="size-12 text-muted" />
          <p className="text-base text-muted">{t("rpNoJobs")}</p>
        </div>
      ) : (
        dash.jobs.map(({ order: o, shopId, shopName, blockedReason }) => {
          const codDue = needsCodCollection(o);
          const phone = shopPhone.get(shopId) ?? null;
          const hidden = (
            <>
              <input type="hidden" name="orderId" value={o.id} />
              <input type="hidden" name="shopId" value={shopId} />
              {activeFilter && <input type="hidden" name="filter" value={activeFilter} />}
            </>
          );
          return (
            <article key={o.id} className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border" data-testid="rider-job" data-shop={shopName}>
              <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700" data-testid="rider-job-shop">
                <Store className="size-4" /> {shopName}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-foreground">#{o.orderNo}</p>
                <span className="rounded-full bg-muted-surface px-3 py-1 text-sm text-foreground">
                  {o.deliveryStatus === "picked_up" ? t("rpEnRoute") : t("rpWaitPickup")}
                </span>
              </div>
              <ul className="text-base text-foreground">
                {o.items.map((it) => (
                  <li key={it.id}>{it.nameSnapshot} ×{it.quantity}{it.options?.length ? ` · ${formatOrderLineOptions(it.options)}` : ""}</li>
                ))}
              </ul>
              {o.note && <p className="text-sm text-muted">{t("rpNote", { note: o.note })}</p>}
              <div className="text-base text-foreground">
                <p className="font-semibold">{o.customerName ?? t("rpCustomer")}</p>
                {o.deliveryAddress && <p>{o.deliveryAddress}</p>}
                {o.deliveryLandmark && (
                  <p className="text-sm text-muted">{t("landmark")}: {o.deliveryLandmark}</p>
                )}
              </div>
              <p className="text-base font-semibold text-foreground">
                {t("rpTotal", { amount: satangToBaht(o.totalSatang) })} ·{" "}
                {o.paymentStatus === "paid" ? t("rpPaid") : o.paymentMethod === "cash" ? t("rpCod") : t("rpUnpaidTransfer")}
              </p>
              {orderNavigationUrl(o) && (
                <a
                  href={orderNavigationUrl(o) as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="rider-navigate"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-lg font-bold text-white shadow transition hover:bg-blue-700"
                >
                  <Navigation className="size-5" /> {t("navigate")}
                </a>
              )}
              <div className="flex gap-2">
                {o.customerPhone && (
                  <a href={`tel:${o.customerPhone}`} className={linkBtn} data-testid="rider-call-customer">
                    <Phone className="size-4" /> {t("callCustomer")}
                  </a>
                )}
                {phone && (
                  <a href={`tel:${phone}`} className={linkBtn} data-testid="rider-call-shop">
                    <Store className="size-4" /> {t("callShop")}
                  </a>
                )}
              </div>
              {blockedReason && (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800" data-testid="rider-job-blocked">
                  <Clock className="mt-0.5 size-4 shrink-0" /> {blockedReason}
                </p>
              )}
              {o.deliveryStatus === "assigned" && (
                <form method="post" action="/rider/job">
                  {hidden}
                  <input type="hidden" name="do" value="picked_up" />
                  <button
                    disabled={!!blockedReason}
                    className={`${bigBtn} bg-brand-500 text-on-brand disabled:cursor-not-allowed disabled:opacity-40`}
                    data-testid="rider-btn-picked-up"
                  >
                    <Package className="size-6" /> {t("rpPickedUp")}
                  </button>
                </form>
              )}
              {o.deliveryStatus === "picked_up" && codDue && (
                <>
                  <p className="flex items-center gap-2 text-sm text-foreground">
                    <Banknote className="size-4" /> {t("rpCodFirst")}
                  </p>
                  <form method="post" action="/rider/job">
                    {hidden}
                    <input type="hidden" name="do" value="cod_delivered" />
                    <button className={`${bigBtn} bg-brand-500 text-on-brand`} data-testid="rider-btn-cod-delivered">
                      <Banknote className="size-6" /> {t("rpCodDeliverBtn", { amount: satangToBaht(o.totalSatang) })}
                    </button>
                  </form>
                </>
              )}
              {o.deliveryStatus === "picked_up" && !codDue && (
                <form method="post" action="/rider/job">
                  {hidden}
                  <input type="hidden" name="do" value="delivered" />
                  <button className={`${bigBtn} bg-brand-500 text-on-brand`} data-testid="rider-btn-delivered">
                    <CheckCircle2 className="size-6" /> {t("rpDelivered")}
                  </button>
                </form>
              )}
              {o.codCollected && (
                <span className="inline-flex items-center gap-1 text-sm text-foreground">
                  <Banknote className="size-4" /> {t("codCollected")}
                </span>
              )}
            </article>
          );
        })
      )}
      <p className="text-center text-xs text-muted">{t("autoRefresh")}</p>
    </main>
  );
}
