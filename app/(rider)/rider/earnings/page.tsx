import { Banknote, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import {
  GetRiderEarningsUseCase,
  type RiderEarningsPeriod,
} from "@/src/application/use-cases/rider/RiderUseCases";
import { getRiderSession } from "@/src/infrastructure/auth/rider-session";
import { satangToBaht } from "@/src/presentation/lib/money";

const fmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** รายได้ tab: totals, per-shop split (cash to hand back to EACH shop), last 30 deliveries. */
export default async function RiderEarningsPage() {
  const session = await getRiderSession();
  if (!session) return null;
  const t = await getTranslations("rider");
  const data = await new GetRiderEarningsUseCase(container.orderRepository).execute(session);
  const multi = data.perShop.length > 1;

  const card = (title: string, p: RiderEarningsPeriod, testid: string) => (
    <section className="flex flex-col gap-2 rounded-2xl bg-card p-4 ring-1 ring-border" data-testid={testid}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <span className="text-sm text-muted">{t("earnTrips", { count: p.trips })}</span>
      </div>
      <p className="text-3xl font-bold text-foreground">{satangToBaht(p.commissionSatang)}</p>
      <p className="text-sm text-muted">
        {t("earnCodReturn")}: <span className="font-semibold text-foreground">{satangToBaht(p.codCollectedSatang)}</span>
      </p>
    </section>
  );

  return (
    <main className="flex flex-col gap-4 px-4 py-4">
      <h1 className="text-xl font-bold text-foreground">{t("tabEarnings")}</h1>
      {card(t("earnToday"), data.today, "rider-earn-today")}
      {card(t("earnWeek"), data.week, "rider-earn-week")}

      {multi && (
        <section className="flex flex-col gap-2" data-testid="rider-earn-per-shop">
          <h2 className="text-base font-bold text-foreground">{t("perShopTitle")}</h2>
          <ul className="divide-y divide-border rounded-2xl bg-card ring-1 ring-border">
            {data.perShop.map((s) => (
              <li key={s.shopId} className="flex flex-col gap-1 px-4 py-3" data-testid="rider-earn-shop">
                <p className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Store className="size-4" /> {s.shopName}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted">{t("earnToday")} · {t("earnTrips", { count: s.today.trips })}</p>
                    <p className="font-semibold text-foreground">{t("commissionShort")} {satangToBaht(s.today.commissionSatang)}</p>
                    <p className="text-foreground">{t("cashDue")} {satangToBaht(s.today.codCollectedSatang)}</p>
                  </div>
                  <div>
                    <p className="text-muted">{t("earnWeek")} · {t("earnTrips", { count: s.week.trips })}</p>
                    <p className="font-semibold text-foreground">{t("commissionShort")} {satangToBaht(s.week.commissionSatang)}</p>
                    <p className="text-foreground">{t("cashDue")} {satangToBaht(s.week.codCollectedSatang)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-bold text-foreground">{t("earnHistory")}</h2>
        {data.history.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">{t("earnEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl bg-card ring-1 ring-border" data-testid="rider-history">
            {data.history.map(({ order: o, shopName, cashDue }) => (
              <li key={o.id} className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    #{o.orderNo} <span className="text-xs font-normal text-muted">· {shopName}</span>
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted">
                    {o.deliveredAt ? fmt.format(new Date(o.deliveredAt)) : ""}
                    {cashDue && (
                      <>
                        {" · "}
                        <Banknote className="size-3.5" /> {t("cashDue")} {satangToBaht(o.totalSatang)}
                      </>
                    )}
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-foreground">{satangToBaht(o.riderCommissionSatang ?? 0)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
