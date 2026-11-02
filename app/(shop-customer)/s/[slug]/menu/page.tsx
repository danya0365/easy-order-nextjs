import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, ShoppingBag, Store, UtensilsCrossed } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getOrderAccess } from "@/src/infrastructure/auth/order-access";
import {
  buildBookPages,
  parseMenuView,
  parsePageParam,
} from "@/src/domain/services/public-menu";
import { MenuBookSheet } from "@/src/presentation/components/public-menu/MenuBookSheet";
import { MenuBookViewer } from "@/src/presentation/components/public-menu/MenuBookViewer";
import { MenuListClient } from "@/src/presentation/components/public-menu/MenuListClient";
import { MenuPrintButton } from "@/src/presentation/components/public-menu/MenuPrintButton";
import { MenuViewSwitch } from "@/src/presentation/components/public-menu/MenuViewSwitch";
import { loadPublicMenuSections, loadPublicMenuShop } from "./load-menu";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type Search = Promise<{ view?: string; page?: string; cat?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const [data, t] = await Promise.all([loadPublicMenuShop(slug), getTranslations("publicMenu")]);
  if (!data) return {};
  return { title: t("metaTitle", { name: data.shop.name }) };
}

/**
 * Public, read-only menu. Needs no QR session: it only DISPLAYS. Ordering stays
 * behind the existing shop-QR gate — the only CTA links to /s/[slug]/order, and
 * only when this device already holds order access for the shop.
 */
export default async function PublicMenuPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await loadPublicMenuShop(slug);
  if (!data) notFound();
  const { shop, view: shopView } = data;
  const [t, sections, orderAccess] = await Promise.all([
    getTranslations("publicMenu"),
    loadPublicMenuSections(shop.id),
    getOrderAccess(slug),
  ]);
  const view = parseMenuView(sp.view);
  const canOrder = shop.onlineOrderingEnabled && !!orderAccess && orderAccess.shopId === shop.id;
  const bookPages = buildBookPages(sections);
  const sheets = (linkItems: boolean) =>
    bookPages.map((page, i) => (
      <MenuBookSheet
        key={i}
        page={page}
        index={i}
        total={bookPages.length}
        shop={shopView}
        linkItems={linkItems}
      />
    ));

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <MenuViewSwitch slug={slug} current={view} />
      <div className="flex-1" />
      <Link
        href={`/s/${slug}/menu/print`}
        className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-sm font-semibold text-foreground ring-1 ring-border transition hover:bg-muted-surface"
        data-testid="menu-compact-link"
      >
        <FileText className="size-4" /> {t("compactEntry")}
      </Link>
      <MenuPrintButton />
      {canOrder && (
        <Link
          href={`/s/${slug}/order`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 text-sm font-bold text-on-brand transition hover:bg-brand-600"
        >
          <ShoppingBag className="size-4" /> {t("orderCta")}
        </Link>
      )}
    </div>
  );

  // Print book: same sheets as the on-screen book, shown only on paper.
  const printBook = (
    <div className="menuprint hidden print:block" data-testid="menu-print-book">
      {sheets(false)}
    </div>
  );

  if (view === "book") {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 pt-3">
        <div className="print:hidden">{toolbar}</div>
        <MenuBookViewer pageCount={bookPages.length}>{sheets(true)}</MenuBookViewer>
        {printBook}
      </main>
    );
  }

  const catId = sections.some((s) => s.category.id === sp.cat) ? sp.cat! : null;
  const initialPage = parsePageParam(sp.page);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 pb-8 pt-4">
      <div className="print:hidden">
        <section className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
          <div className="relative h-32 w-full sm:h-44">
            {shopView.coverSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- internal image route
              <img src={shopView.coverSrc} alt="" className="size-full object-cover" />
            ) : (
              <div className="size-full bg-linear-to-br from-brand-300 to-brand-500" />
            )}
          </div>
          <div className="flex items-end gap-3 px-4 pb-4">
            <div className="-mt-10 size-20 shrink-0 overflow-hidden rounded-2xl bg-card ring-4 ring-card">
              {shopView.logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element -- internal image route
                <img src={shopView.logoSrc} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center bg-brand-50 text-brand-600">
                  <Store className="size-8" />
                </div>
              )}
            </div>
            <div className="min-w-0 pt-2">
              <h1 className="truncate text-xl font-bold text-foreground">
                {t("title")} · {shop.name}
              </h1>
              <p className="text-sm text-muted">{t("subtitle")}</p>
            </div>
          </div>
        </section>
      </div>

      {toolbar}

      {sections.length === 0 ? (
        <p className="rounded-2xl bg-card p-8 text-center text-muted ring-1 ring-border print:hidden">
          <UtensilsCrossed className="mx-auto mb-2 size-8 opacity-50" />
          {t("empty")}
        </p>
      ) : (
        <MenuListClient
          key={`${catId ?? ""}:${initialPage}`}
          slug={slug}
          sections={sections}
          initialCat={catId}
          initialPage={initialPage}
        />
      )}
      {printBook}
    </main>
  );
}
