import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

import type { MenuItem } from "@/src/domain/entities";
import { menuImageSrc } from "@/src/presentation/lib/menu-image";
import { satangToBaht } from "@/src/presentation/lib/money";
import { cn } from "@/src/presentation/components/ui/cn";

/**
 * One menu item card — shared by the list view, the book sheets and the print
 * book. Plain server markup (no hooks) so it renders inside the client viewer
 * as passed-through children. `href` makes the whole card a link.
 */
export function MenuItemCard({
  item,
  href,
  variant = "grid",
}: {
  item: MenuItem;
  href?: string;
  variant?: "grid" | "sheet";
}) {
  const src = menuImageSrc(item);
  const body = (
    <>
      <div
        className={cn(
          "menuitem-img overflow-hidden bg-muted-surface",
          variant === "grid" ? "aspect-4/3 w-full rounded-xl" : "size-20 shrink-0 rounded-lg",
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- internal image route
          <img
            src={src}
            alt={item.name}
            loading="lazy"
            decoding="async"
            width={variant === "grid" ? 400 : 80}
            height={variant === "grid" ? 300 : 80}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted">
            <UtensilsCrossed className="size-6 opacity-40" />
          </div>
        )}
      </div>
      <div className={cn("min-w-0", variant === "grid" ? "mt-2" : "flex-1")}>
        <div className="flex items-baseline gap-2">
          <p className="menuitem-name min-w-0 flex-1 font-semibold text-foreground">{item.name}</p>
          <span className="menuitem-leader" aria-hidden />
          <p className="menuitem-price shrink-0 font-bold text-brand-700">
            ฿{satangToBaht(item.priceSatang)}
          </p>
        </div>
        {item.description && (
          <p className="menuitem-desc mt-0.5 line-clamp-2 text-sm leading-snug text-muted">
            {item.description}
          </p>
        )}
      </div>
    </>
  );
  const cls = cn(
    "menuitem",
    variant === "grid"
      ? "block rounded-2xl bg-card p-2.5 ring-1 ring-border transition hover:ring-brand-300"
      : "menuitem-sheet flex items-start gap-3",
  );
  return href ? (
    <Link
      href={href}
      className={cn(cls, "active:scale-[0.97] active:ring-2 active:ring-brand-400 motion-reduce:active:scale-100")}
      data-testid="menu-item-card"
      // Read by ShopNavPending to paint the detail optimistically on tap.
      data-nav-name={item.name}
      data-nav-img={src ?? undefined}
      data-nav-price={`฿${satangToBaht(item.priceSatang)}`}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
