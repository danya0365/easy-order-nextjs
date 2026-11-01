import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArrowLeft, BookOpen, QrCode, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { getOrderAccess } from "@/src/infrastructure/auth/order-access";
import { GetPublicMenuItemUseCase } from "@/src/application/use-cases/menu/GetPublicMenuItemUseCase";
import { loadOrderingExtras } from "@/src/application/use-cases/menu/MenuOptionUseCases";
import { menuImageSrc } from "@/src/presentation/lib/menu-image";
import { satangToBaht } from "@/src/presentation/lib/money";
import { MenuPrintButton } from "@/src/presentation/components/public-menu/MenuPrintButton";
import { loadPublicMenuShop } from "../load-menu";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string; itemId: string }>;

const loadItem = cache((shopId: string, itemId: string) =>
  new GetPublicMenuItemUseCase(container.menuCategoryRepository, container.menuItemRepository).execute(shopId, itemId),
);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, itemId } = await params;
  const data = await loadPublicMenuShop(slug);
  // The shop-home skeleton (loading.tsx) lives in s/[slug]/(home)/ so it does
  // NOT wrap this route in a Suspense boundary — otherwise a 200 is committed
  // before notFound() runs and the not-found UI ships with status 200.
  if (!data) notFound();
  const [found, t] = await Promise.all([loadItem(data.shop.id, itemId), getTranslations("publicMenu")]);
  if (!found) notFound();
  return { title: t("metaItemTitle", { item: found.item.name, name: data.shop.name }) };
}

/** Read-only item detail (no add-to-cart; ordering stays behind the shop QR gate). */
export default async function PublicMenuItemPage({ params }: { params: Params }) {
  const { slug, itemId } = await params;
  const data = await loadPublicMenuShop(slug);
  if (!data) notFound();
  const { shop } = data;
  const found = await loadItem(shop.id, itemId);
  if (!found) notFound();
  const { item, category } = found;
  const [t, extras, orderAccess] = await Promise.all([
    getTranslations("publicMenu"),
    loadOrderingExtras(container.platformSettingsRepository, container.menuOptionRepository, shop, [item.id]),
    getOrderAccess(slug),
  ]);
  const groups = (extras.optionGroups ?? []).filter((g) => g.menuItemId === item.id);
  const canOrder = shop.onlineOrderingEnabled && !!orderAccess && orderAccess.shopId === shop.id;
  const src = menuImageSrc(item);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-8 pt-4" data-testid="menu-item-detail">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link href={`/s/${slug}/menu`} className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-sm font-semibold ring-1 ring-border">
          <ArrowLeft className="size-4" /> {t("backToMenu")}
        </Link>
        <Link href={`/s/${slug}/menu?view=book`} className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-sm font-semibold ring-1 ring-border">
          <BookOpen className="size-4" /> {t("viewBook")}
        </Link>
        <div className="flex-1" />
        <MenuPrintButton />
      </div>

      <article className="menu-detail overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border md:grid md:grid-cols-2">
        <div className="aspect-square w-full bg-muted-surface">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- internal image route
            <img src={src} alt={item.name} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted">
              <UtensilsCrossed className="size-12 opacity-40" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            <Link href={`/s/${slug}/menu?cat=${category.id}`} className="hover:underline">
              {t("category", { name: category.name })}
            </Link>
          </p>
          <h1 className="text-2xl font-bold text-foreground">{item.name}</h1>
          <p className="text-2xl font-extrabold text-brand-700">฿{satangToBaht(item.priceSatang)}</p>
          {item.description && (
            <p className="whitespace-pre-line leading-relaxed text-foreground">{item.description}</p>
          )}

          {groups.length > 0 && (
            <section className="mt-2 flex flex-col gap-3" data-testid="menu-item-options">
              <h2 className="text-base font-bold text-foreground">{t("optionsTitle")}</h2>
              {groups.map((g) => (
                <div key={g.id} className="rounded-xl bg-background p-3 ring-1 ring-border">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                    {g.name}
                    {g.isRequired && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{t("optionRequired")}</span>
                    )}
                    <span className="text-xs font-normal text-muted">
                      {g.minSelect > 0
                        ? t("optionPickRange", { min: g.minSelect, max: g.maxSelect })
                        : t("optionPickUpTo", { max: g.maxSelect })}
                    </span>
                  </p>
                  <ul className="mt-2 divide-y divide-border text-sm">
                    {g.choices.map((c) => (
                      <li key={c.id} className="flex items-center justify-between py-1.5">
                        <span className={c.isAvailable ? "text-foreground" : "text-muted line-through"}>{c.name}</span>
                        <span className="text-muted">
                          {!c.isAvailable
                            ? t("optionUnavailable")
                            : c.priceDeltaSatang
                              ? `+฿${satangToBaht(c.priceDeltaSatang)}`
                              : t("optionFree")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          <div className="mt-auto pt-2 print:hidden">
            {canOrder ? (
              <Link href={`/s/${slug}/order`} className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 font-bold text-on-brand transition hover:bg-brand-600">
                <ShoppingBag className="size-5" /> {t("orderCta")}
              </Link>
            ) : (
              <p className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-700">
                <QrCode className="size-4 shrink-0" /> {t("orderNeedQr")}
              </p>
            )}
          </div>
        </div>
      </article>
    </main>
  );
}
