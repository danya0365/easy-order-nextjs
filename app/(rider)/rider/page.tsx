import { Banknote, CheckCircle2, Navigation, Package, Phone, Store } from "lucide-react";

import { formatOrderLineOptions } from "@/src/domain/services/menu-options";
import { orderNavigationUrl } from "@/src/domain/services/delivery-location";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { GetRiderDashboardUseCase } from "@/src/application/use-cases/rider/RiderUseCases";
import { getSessionRider } from "@/src/infrastructure/auth/rider-session";
import { satangToBaht } from "@/src/presentation/lib/money";
import { RiderAutoRefresh } from "@/src/presentation/components/rider/RiderAutoRefresh";
import { RiderAvatar } from "@/src/presentation/components/rider/RiderAvatar";

const bigBtn =
  "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-4 text-lg font-bold";
const linkBtn =
  "inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 text-sm font-semibold text-foreground";

/** งาน tab: availability switch + active jobs with big step buttons. */
export default async function RiderJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const session = await getSessionRider();
  if (!session) return null;
  const { e } = await searchParams;
  const t = await getTranslations("rider");
  const dash = await new GetRiderDashboardUseCase(
    container.riderRepository,
    container.orderRepository,
  ).execute(session.token);
  if (!dash) return null;
  const shop = await container.shopRepository.findById(dash.rider.shopId);
  const shopPhone = (await container.shopProfileRepository.get(dash.rider.shopId).catch(() => null))?.phone ?? null;
  const { rider } = dash;

  return (
    <main className="flex flex-col gap-4 px-4 py-4">
      <RiderAutoRefresh seconds={30} />
      <header className="flex items-center gap-3">
        <RiderAvatar rider={rider} size={44} />
        <div className="min-w-0">
          <p className="truncate text-xs text-muted">{shop?.name}</p>
          <h1 className="truncate text-lg font-bold text-foreground">{rider.name}</h1>
        </div>
      </header>

      <form method="post" action="/rider/availability" data-testid="rider-availability">
        <input type="hidden" name="available" value={rider.available ? "0" : "1"} />
        <button
          role="switch"
          aria-checked={rider.available}
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-card px-4 ring-1 ring-border"
        >
          <span className="text-base font-semibold text-foreground">
            {t("rpStatusLabel", { status: rider.available ? t("available") : t("busy") })}
          </span>
          <span
            className={`relative h-8 w-14 rounded-full transition ${rider.available ? "bg-brand-500" : "bg-muted-surface ring-1 ring-border"}`}
          >
            <span
              className={`absolute top-1 size-6 rounded-full bg-card shadow ${rider.available ? "right-1" : "left-1"}`}
            />
          </span>
        </button>
      </form>

      {e === "failed" && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t("rpFailed")}</p>
      )}

      {dash.jobs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center" data-testid="rider-empty">
          <Package className="size-12 text-muted" />
          <p className="text-base text-muted">{t("rpNoJobs")}</p>
        </div>
      ) : (
        dash.jobs.map((o) => {
          const cod = o.paymentMethod === "cash" && o.paymentStatus !== "paid";
          return (
            <article key={o.id} className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border" data-testid="rider-job">
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
                {shopPhone && (
                  <a href={`tel:${shopPhone}`} className={linkBtn}>
                    <Store className="size-4" /> {t("callShop")}
                  </a>
                )}
              </div>
              {o.deliveryStatus === "assigned" && (
                <form method="post" action="/rider/job">
                  <input type="hidden" name="orderId" value={o.id} />
                  <input type="hidden" name="do" value="picked_up" />
                  <button className={`${bigBtn} bg-brand-500 text-on-brand`}>
                    <Package className="size-6" /> {t("rpPickedUp")}
                  </button>
                </form>
              )}
              {o.deliveryStatus === "picked_up" && cod && !o.codCollected && (
                <form method="post" action="/rider/job">
                  <input type="hidden" name="orderId" value={o.id} />
                  <input type="hidden" name="do" value="cod" />
                  <button className={`${bigBtn} border-2 border-brand-500 text-brand-700`}>
                    <Banknote className="size-6" /> {t("rpCodBtn")}
                  </button>
                </form>
              )}
              {o.deliveryStatus === "picked_up" && (
                <form method="post" action="/rider/job">
                  <input type="hidden" name="orderId" value={o.id} />
                  <input type="hidden" name="do" value="delivered" />
                  <button className={`${bigBtn} bg-brand-500 text-on-brand`}>
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
