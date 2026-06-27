import Link from "next/link";
import { ChevronRight, Map as MapIcon, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Button } from "@/src/presentation/components/ui/Button";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function ShopsDirectoryPage() {
  const t = await getTranslations("publicPages");

  // Public directory: active shops only, sorted by name (Thai-aware). Easy Order
  // has no reviews/categories/profile images, so this is a plain alphabetical
  // list — each row links to the shop's page at /s/[slug].
  const shops = await container.shopRepository.list();
  const items = shops
    .filter((s) => s.status === "active")
    .sort((a, b) => a.name.localeCompare(b.name, "th"));

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

      <Card>
        <CardHeader title={t("shopsCount", { count: items.length })} />
        {items.length === 0 ? (
          <EmptyState icon={<Store />} title={t("noShops")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((shop) => (
              <li key={shop.slug}>
                <Link
                  href={`/s/${shop.slug}`}
                  className="flex items-center gap-3 py-3 transition hover:opacity-80"
                >
                  {shop.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external logo URL
                    <img
                      src={shop.logoUrl}
                      alt={shop.name}
                      className="size-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted-surface text-muted">
                      <Store className="size-5" />
                    </span>
                  )}
                  <p className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {shop.name}
                  </p>
                  <ChevronRight className="size-5 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
