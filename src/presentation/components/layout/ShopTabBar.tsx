"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, ShoppingBag, Store, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/src/presentation/components/ui/cn";

interface Tab {
  href: string;
  label: "navShopHome" | "navShopOrder" | "navShopOrders";
  icon: LucideIcon;
  active: (pathname: string) => boolean;
}

/**
 * Bottom navigation for a single shop's customer PWA (`/s/[slug]/*`).
 * Scoped to one slug — no platform discovery tabs (map / shops / tutorial / about).
 */
export function ShopTabBar({ slug }: { slug: string }) {
  const t = useTranslations("layout");
  const pathname = usePathname();
  const base = `/s/${slug}`;

  const tabs: Tab[] = [
    {
      href: base,
      label: "navShopHome",
      icon: Store,
      // Exact home only — not /order or /orders.
      active: (p) => p === base,
    },
    {
      href: `${base}/order`,
      label: "navShopOrder",
      icon: ShoppingBag,
      // Match /order and nested paths, but not /orders.
      active: (p) => p === `${base}/order` || p.startsWith(`${base}/order/`),
    },
    {
      href: `${base}/orders`,
      label: "navShopOrders",
      icon: History,
      active: (p) => p === `${base}/orders` || p.startsWith(`${base}/orders/`),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur print:hidden">
      <ul className="mx-auto flex max-w-md items-stretch pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.active(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition",
                  isActive
                    ? "text-brand-600"
                    : "text-muted hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                {t(tab.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
