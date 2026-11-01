import { Phone, Smartphone, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { getSessionRider } from "@/src/infrastructure/auth/rider-session";
import { RiderAvatar } from "@/src/presentation/components/rider/RiderAvatar";
import { RiderAvatarUpload } from "@/src/presentation/components/rider/RiderAvatarUpload";

/** ฉัน tab: profile (read-only name/phone), shop, photo upload, A2HS hint. */
export default async function RiderMePage() {
  const session = await getSessionRider();
  if (!session) return null;
  const t = await getTranslations("rider");
  const { rider } = session;
  const shop = await container.shopRepository.findById(rider.shopId);
  const shopPhone = (await container.shopProfileRepository.get(rider.shopId).catch(() => null))?.phone ?? null;

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <section className="flex flex-col items-center gap-3 text-center" data-testid="rider-me">
        <RiderAvatar rider={rider} size={112} />
        <h1 className="text-2xl font-bold text-foreground">{rider.name}</h1>
        <RiderAvatarUpload />
      </section>
      <dl className="divide-y divide-border rounded-2xl bg-card ring-1 ring-border">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <dt className="text-sm text-muted">{t("mePhone")}</dt>
          <dd className="font-semibold text-foreground">{rider.phone}</dd>
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <dt className="text-sm text-muted">{t("meShop")}</dt>
          <dd className="flex items-center gap-1 font-semibold text-foreground">
            <Store className="size-4" /> {shop?.name}
          </dd>
        </div>
      </dl>
      <p className="text-center text-xs text-muted">{t("meEditHint")}</p>
      {shopPhone && (
        <a
          href={`tel:${shopPhone}`}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-lg font-bold text-on-brand"
        >
          <Phone className="size-5" /> {t("callShop")}
        </a>
      )}
      <p className="flex items-start gap-2 rounded-xl bg-muted-surface px-3 py-2 text-xs text-muted">
        <Smartphone className="mt-0.5 size-4 shrink-0" /> {t("meA2HS")}
      </p>
    </main>
  );
}
