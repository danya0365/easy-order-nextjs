import Link from "next/link";
import { BookOpenCheck, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { pageGuides } from "@/src/domain/guides/shop-guides";

export const dynamic = "force-dynamic";

export default async function ShopGuidesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireShopAccess();
  const sp = await searchParams;
  const t = await getTranslations("guides");
  const lang = (await getLocale()) === "en" ? "en" : "th";
  const { items, page, totalPages } = pageGuides(Number(sp.page ?? 1));
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2" data-testid="guide-list">
        {items.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/shop/guides/${g.slug}`}
              data-testid="guide-card"
              className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-4 hover:border-brand-500"
            >
              <span className="flex items-center gap-2 font-semibold text-foreground">
                <BookOpenCheck className="size-5 text-brand-600" aria-hidden />
                {g.title[lang]}
              </span>
              <span className="text-sm text-muted-foreground">{g.purpose[lang]}</span>
              <span className="mt-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="size-3.5" aria-hidden />
                {t("audience")}: {g.audience.map((a) => t(a === "owner" ? "audOwner" : "audStaff")).join(" · ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm" data-testid="guide-pagination">
          {page > 1 && (
            <Link href={`/shop/guides?page=${page - 1}`} className="inline-flex items-center gap-1">
              <ChevronLeft className="size-4" aria-hidden />
              {t("prev")}
            </Link>
          )}
          <span>{t("pageOf", { page, total: totalPages })}</span>
          {page < totalPages && (
            <Link href={`/shop/guides?page=${page + 1}`} className="inline-flex items-center gap-1">
              {t("next")}
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
