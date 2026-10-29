import Link from "next/link";
import { Megaphone, ShoppingBag } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { ShopPromotion } from "@/src/domain/entities";

/** Server component — promo cards for the customer PWA. No interactivity. */
export async function CustomerPromotionsPanel({
  slug,
  promotions,
}: {
  slug: string;
  promotions: ShopPromotion[];
}) {
  const t = await getTranslations("promotions");
  return (
    <section className="mx-auto max-w-lg space-y-4 p-4">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Megaphone className="size-5 text-brand-600" />
        {t("customerTitle")}
      </h1>
      {promotions.length === 0 ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {promotions.map((promo) => (
            <li
              key={promo.id}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              {promo.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- remote owner-supplied promo URL; simple img keeps it kiosk-friendly
                <img
                  src={promo.imageUrl}
                  alt={promo.title}
                  className="h-40 w-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="space-y-1 p-3">
                <p className="font-semibold text-foreground">{promo.title}</p>
                {promo.description && (
                  <p className="whitespace-pre-line text-sm text-muted">
                    {promo.description}
                  </p>
                )}
              </div>
              <Link
                href={`/s/${slug}/order`}
                className="flex items-center justify-center gap-2 border-t border-border py-2.5 text-sm font-medium text-brand-600"
              >
                <ShoppingBag className="size-4" />
                {t("orderCta")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
