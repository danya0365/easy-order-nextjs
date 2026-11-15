import { LogOut, Phone, Smartphone, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { getRiderSession } from "@/src/infrastructure/auth/rider-session";
import { RiderAvatar } from "@/src/presentation/components/rider/RiderAvatar";
import { RiderAvatarUpload } from "@/src/presentation/components/rider/RiderAvatarUpload";

/** ฉัน tab: account profile, photo upload, the shops this device works for, logout. */
export default async function RiderMePage() {
  const session = await getRiderSession();
  if (!session) return null;
  const t = await getTranslations("rider");
  const { account, memberships } = session;
  const phones = await Promise.all(
    memberships.map(async (m) => (await container.shopProfileRepository.get(m.shopId).catch(() => null))?.phone ?? null),
  );

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <section className="flex flex-col items-center gap-3 text-center" data-testid="rider-me">
        <RiderAvatar rider={{ id: memberships[0].rider.id, name: account.name, avatarUrl: account.avatarUrl ?? memberships[0].rider.avatarUrl }} size={112} />
        <h1 className="text-2xl font-bold text-foreground">{account.name}</h1>
        {session.full && <RiderAvatarUpload />}
      </section>
      <dl className="divide-y divide-border rounded-2xl bg-card ring-1 ring-border">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <dt className="text-sm text-muted">{t("mePhone")}</dt>
          <dd className="font-semibold text-foreground">{account.phone}</dd>
        </div>
      </dl>

      <section className="flex flex-col gap-2" data-testid="rider-me-shops">
        <h2 className="text-base font-bold text-foreground">{t("meShops")}</h2>
        <ul className="divide-y divide-border rounded-2xl bg-card ring-1 ring-border">
          {memberships.map((m, i) => (
            <li key={m.shopId} className="flex items-center justify-between gap-2 px-4 py-3" data-testid="rider-me-shop">
              <span className="flex min-w-0 items-center gap-1.5 font-semibold text-foreground">
                <Store className="size-4 shrink-0" /> <span className="truncate">{m.shopName}</span>
              </span>
              {phones[i] && (
                <a
                  href={`tel:${phones[i]}`}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-3 text-sm font-bold text-on-brand"
                >
                  <Phone className="size-4" /> {t("callShop")}
                </a>
              )}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">{t("meAddShopHint")}</p>
      </section>

      <p className="text-center text-xs text-muted">{t("meEditHint")}</p>
      <p className="flex items-start gap-2 rounded-xl bg-muted-surface px-3 py-2 text-xs text-muted">
        <Smartphone className="mt-0.5 size-4 shrink-0" /> {t("meA2HS")}
      </p>
      <form method="post" action="/rider/logout">
        <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground" data-testid="rider-logout">
          <LogOut className="size-4" /> {t("meLogout")}
        </button>
      </form>
    </main>
  );
}
