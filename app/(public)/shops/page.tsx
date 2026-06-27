import Link from "next/link";
import { ChevronRight, Map as MapIcon, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Button } from "@/src/presentation/components/ui/Button";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { cn } from "@/src/presentation/components/ui/cn";

export const dynamic = "force-dynamic";

export default async function ShopsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const t = await getTranslations("publicPages");

  const [shops, categories] = await Promise.all([
    container.shopRepository.list(),
    container.shopCategoryRepository.listActive(),
  ]);
  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  const slugById = new Map(categories.map((c) => [c.id, c.slug]));

  // Public directory: active shops only, optional category filter, name-sorted.
  const items = shops
    .filter(
      (s) =>
        s.status === "active" &&
        (!category || slugById.get(s.categoryId ?? "") === category),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "th"));

  // Batched profile images for the visible shops (no N+1).
  const profiles = await container.shopImageRepository.profilesByShop(
    items.map((s) => s.id),
  );

  const filters = [
    { slug: null as string | null, label: t("filterAll") },
    ...categories.map((c) => ({ slug: c.slug, label: c.name })),
  ];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-foreground">{t("allShopsTitle")}</h1>
        <Link href="/">
          <Button variant="outline" size="sm">
            <MapIcon size={14} />
            {t("mapButton")}
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => {
          const activeChip = (f.slug ?? null) === (category ?? null);
          return (
            <Link
              key={f.slug ?? "all"}
              href={f.slug ? `/shops?category=${f.slug}` : "/shops"}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                activeChip
                  ? "bg-brand-500 text-on-brand"
                  : "bg-muted-surface text-muted hover:text-foreground",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader title={t("shopsCount", { count: items.length })} />
        {items.length === 0 ? (
          <EmptyState
            icon={<Store />}
            title={category ? t("noShopsInCategory") : t("noShops")}
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((shop) => {
              const cat = shop.categoryId ? nameById.get(shop.categoryId) : null;
              const profileId = profiles[shop.id];
              const imgSrc = profileId
                ? `/api/shop-images/${profileId}`
                : shop.logoUrl;
              return (
                <li key={shop.slug}>
                  <Link
                    href={`/s/${shop.slug}`}
                    className="flex items-center gap-3 py-3 transition hover:opacity-80"
                  >
                    {imgSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element -- internal/external image
                      <img
                        src={imgSrc}
                        alt={shop.name}
                        className="size-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted-surface text-muted">
                        <Store className="size-5" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">
                        {shop.name}
                      </span>
                      {cat && (
                        <span className="block truncate text-xs text-muted">
                          {cat}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </main>
  );
}
