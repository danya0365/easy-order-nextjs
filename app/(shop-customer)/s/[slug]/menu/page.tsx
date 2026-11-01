import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, ShoppingBag, Store, UtensilsCrossed } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getOrderAccess } from "@/src/infrastructure/auth/order-access";
import {
  buildBookPages,
  flattenSections,
  groupByCategory,
  paginate,
  parseMenuView,
  parsePageParam,
  PUBLIC_MENU_PAGE_SIZE,
} from "@/src/domain/services/public-menu";
import { MenuBookSheet } from "@/src/presentation/components/public-menu/MenuBookSheet";
import { MenuBookViewer } from "@/src/presentation/components/public-menu/MenuBookViewer";
import { MenuItemCard } from "@/src/presentation/components/public-menu/MenuItemCard";
import { MenuPrintButton } from "@/src/presentation/components/public-menu/MenuPrintButton";
import { MenuViewSwitch } from "@/src/presentation/components/public-menu/MenuViewSwitch";
import { cn } from "@/src/presentation/components/ui/cn";
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
  const slice = paginate(flattenSections(sections, catId), parsePageParam(sp.page), PUBLIC_MENU_PAGE_SIZE);
  const groups = groupByCategory(slice.items);
  const href = (page: number, cat: string | null = catId) => {
    const q = new URLSearchParams();
    if (cat) q.set("cat", cat);
    if (page > 1) q.set("page", String(page));
    const s = q.toString();
    return `/s/${slug}/menu${s ? `?${s}` : ""}`;
  };

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
        <div className="flex flex-col gap-4 print:hidden" data-testid="menu-list">
          <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label={t("allCategories")}>
            {[{ id: null as string | null, name: t("allCategories") }, ...sections.map((s) => s.category)].map((c) => (
              <Link
                key={c.id ?? "all"}
                href={href(1, c.id)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition",
                  catId === c.id ? "bg-brand-500 text-on-brand ring-brand-500" : "bg-card text-foreground ring-border hover:ring-brand-300",
                )}
              >
                {c.name}
              </Link>
            ))}
          </nav>

          {groups.map((g, gi) => (
            <section key={`${g.category.id}-${gi}`}>
              <h2 className="mb-2 flex items-baseline gap-2 text-lg font-bold text-foreground">
                {g.category.name}
                <span className="text-xs font-medium text-muted">
                  {t("itemsCount", { count: sections.find((s) => s.category.id === g.category.id)?.items.length ?? 0 })}
                </span>
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {g.items.map((item) => (
                  <li key={item.id}>
                    <MenuItemCard item={item} href={`/s/${slug}/menu/${item.id}`} />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {slice.totalPages > 1 && (
            <nav className="flex items-center justify-between gap-2" aria-label={t("pagination")} data-testid="menu-pagination">
              {slice.page > 1 ? (
                <Link href={href(slice.page - 1)} rel="prev" className="inline-flex items-center gap-1 rounded-xl bg-card px-3 py-2 text-sm font-semibold ring-1 ring-border">
                  <ChevronLeft className="size-4" /> {t("prev")}
                </Link>
              ) : <span />}
              <span className="text-sm text-muted">{t("pageOf", { page: String(slice.page), total: slice.totalPages })}</span>
              {slice.page < slice.totalPages ? (
                <Link href={href(slice.page + 1)} rel="next" className="inline-flex items-center gap-1 rounded-xl bg-card px-3 py-2 text-sm font-semibold ring-1 ring-border">
                  {t("next")} <ChevronRight className="size-4" />
                </Link>
              ) : <span />}
            </nav>
          )}
        </div>
      )}
      {printBook}
    </main>
  );
}
