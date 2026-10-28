"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gift,
  History,
  Megaphone,
  MoreHorizontal,
  ShoppingBag,
  Store,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/src/presentation/components/ui/cn";

type NavLabelKey =
  | "navShopHome"
  | "navShopOrder"
  | "navShopOrders"
  | "navLoyalty"
  | "navPromotions";

interface Tab {
  href: string;
  label: NavLabelKey;
  icon: LucideIcon;
  active: (pathname: string) => boolean;
}

/** Up to this many links render as plain tabs; beyond it, overflow folds into the "more" sheet. */
const MORE_THRESHOLD = 5;

const TAB_CLASS =
  "flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium transition";

/**
 * Bottom navigation for a single shop's customer PWA (`/s/[slug]/*`).
 * Scoped to one slug — no platform discovery tabs (map / shops / tutorial / about).
 * Loyalty and promotions tabs appear only when the shop has those modules
 * effective (admin allowed + shop enabled). Beyond 5 tabs, extras slide into a
 * "more" bottom sheet (AppTabBar pattern).
 */
export function ShopTabBar({
  slug,
  showLoyalty = false,
  showPromotions = false,
}: {
  slug: string;
  showLoyalty?: boolean;
  showPromotions?: boolean;
}) {
  const t = useTranslations("layout");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
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

  // Priority: loyalty first, then promotions.
  if (showLoyalty) {
    tabs.push({
      href: `${base}/loyalty`,
      label: "navLoyalty",
      icon: Gift,
      active: (p) => p === `${base}/loyalty` || p.startsWith(`${base}/loyalty/`),
    });
  }
  if (showPromotions) {
    tabs.push({
      href: `${base}/promotions`,
      label: "navPromotions",
      icon: Megaphone,
      active: (p) =>
        p === `${base}/promotions` ||
        p.startsWith(`${base}/promotions/`),
    });
  }

  const hasMore = tabs.length > MORE_THRESHOLD;
  const primary = hasMore ? tabs.slice(0, 4) : tabs;
  const overflow = hasMore ? tabs.slice(4) : [];
  const moreActive = overflow.some((tab) => tab.active(pathname));

  // Close the sheet on Escape.
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  return (
    <>
      {hasMore && (
        <MoreSheet
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          items={overflow}
          isActive={(href) => overflow.find((tab) => tab.href === href)?.active(pathname) ?? false}
        />
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur print:hidden">
        <ul className="mx-auto flex max-w-md items-stretch pb-[env(safe-area-inset-bottom)]">
          {primary.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.active(pathname);
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    TAB_CLASS,
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

          {hasMore && (
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                className={cn(
                  TAB_CLASS,
                  moreActive || moreOpen
                    ? "text-brand-600"
                    : "text-muted hover:text-foreground",
                )}
              >
                <MoreHorizontal className="size-5" />
                {t("navMore")}
              </button>
            </li>
          )}
        </ul>
      </nav>
    </>
  );
}

function MoreSheet({
  open,
  onClose,
  items,
  isActive,
}: {
  open: boolean;
  onClose: () => void;
  items: Tab[];
  isActive: (href: string) => boolean;
}) {
  const t = useTranslations("layout");
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 print:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      {/* Scrim */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/30 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("moreMenuAria")}
        className={cn(
          "absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-card shadow-lg transition-transform duration-200 ease-out",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-surface" />
          <ul className="flex flex-col">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition",
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-foreground hover:bg-muted-surface",
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                    {t(item.label)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
