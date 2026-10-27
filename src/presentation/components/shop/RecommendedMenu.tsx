import Link from "next/link";
import { Star } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { MenuItem } from "@/src/domain/entities";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { menuImageSrc } from "@/src/presentation/lib/menu-image";
import { satangToBaht } from "@/src/presentation/lib/money";

export async function RecommendedMenu({
  slug,
  items,
  hasOrderAccess = false,
  onlineOrderingEnabled = false,
}: {
  slug: string;
  items: MenuItem[];
  hasOrderAccess?: boolean;
  onlineOrderingEnabled?: boolean;
}) {
  if (items.length === 0) return null;

  const t = await getTranslations("publicPages");
  const linkToOrder = onlineOrderingEnabled && hasOrderAccess;

  return (
    <Card data-testid="recommended-menu" id="recommended-menu">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Star className="size-5 text-brand-600" fill="currentColor" />
            {t("recommendedMenuTitle")}
          </span>
        }
      />
      <ul className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const src = menuImageSrc(item);
          const body = (
            <>
              <div className="aspect-square w-full overflow-hidden rounded-xl bg-muted-surface ring-1 ring-border">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element -- internal image route
                  <img
                    src={src}
                    alt={item.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted">
                    <Star className="size-6 opacity-40" />
                  </div>
                )}
              </div>
              <p className="mt-2 truncate text-sm font-medium text-foreground">
                {item.name}
              </p>
              <p className="text-sm text-muted">
                ฿{satangToBaht(item.priceSatang)}
              </p>
            </>
          );

          return (
            <li key={item.id}>
              {linkToOrder ? (
                <Link
                  href={`/s/${slug}/order`}
                  className="block rounded-xl transition hover:opacity-90"
                >
                  {body}
                </Link>
              ) : (
                <div>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
