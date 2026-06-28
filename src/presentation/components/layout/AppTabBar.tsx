"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Bell,
  Building2,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  MoreHorizontal,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Star,
  Store,
  UserCog,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/src/presentation/components/ui/cn";

/** A `layout`-namespace message key for a nav label (resolved with `t()`). */
type NavLabelKey =
  | "navOrders"
  | "navNewOrder"
  | "navDashboard"
  | "navMenu"
  | "navCustomers"
  | "navReviews"
  | "navNotifications"
  | "navBilling"
  | "navBranches"
  | "navStaff"
  | "navSettings"
  | "navSecurity"
  | "navContactAdmin"
  | "navOverview"
  | "navShops"
  | "navPayments"
  | "navContacts";

interface NavItem {
  href: string;
  label: NavLabelKey;
  icon: LucideIcon;
}

// Nav config lives in this client component because lucide icons are functions
// and cannot be passed as props across the Server→Client boundary (same reason
// CustomerTabBar hardcodes its tabs). Labels are `layout` message keys, resolved
// at render. Order = frequency of use: the first 4 links are the always-visible
// primary tabs; the rest fold into the "more" sheet.
const NAVS = {
  shop: [
    // Primary (daily): the live order queue + opening orders are the core counter actions.
    { href: "/shop/orders", label: "navOrders", icon: ClipboardList },
    { href: "/shop/new-order", label: "navNewOrder", icon: ShoppingCart },
    { href: "/shop/menu", label: "navMenu", icon: UtensilsCrossed },
    { href: "/shop", label: "navDashboard", icon: LayoutDashboard },
    { href: "/shop/notifications", label: "navNotifications", icon: Bell },
    // Overflow (periodic → setup → rare)
    { href: "/shop/customers", label: "navCustomers", icon: Users },
    { href: "/shop/reviews", label: "navReviews", icon: Star },
    { href: "/shop/billing", label: "navBilling", icon: CreditCard },
    { href: "/shop/branches", label: "navBranches", icon: Building2 },
    { href: "/shop/staff", label: "navStaff", icon: UserCog },
    { href: "/shop/settings", label: "navSettings", icon: Settings },
    { href: "/shop/security", label: "navSecurity", icon: ShieldAlert },
    { href: "/shop/contact", label: "navContactAdmin", icon: LifeBuoy },
  ],
  admin: [
    // Primary: shop management + payment-slip approval are the daily admin tasks.
    { href: "/admin", label: "navOverview", icon: LayoutDashboard },
    { href: "/admin/shops", label: "navShops", icon: Store },
    { href: "/admin/payments", label: "navPayments", icon: CreditCard },
    { href: "/admin/notifications", label: "navNotifications", icon: Bell },
    // Overflow
    { href: "/admin/contacts", label: "navContacts", icon: MessageSquare },
    { href: "/admin/reviews", label: "navReviews", icon: Star },
    { href: "/admin/security", label: "navSecurity", icon: ShieldAlert },
  ],
  staff: [
    { href: "/staff", label: "navNewOrder", icon: ShoppingCart },
    { href: "/staff/notifications", label: "navNotifications", icon: Bell },
    { href: "/staff/settings", label: "navSettings", icon: Settings },
  ],
} satisfies Record<string, NavItem[]>;

/** Up to this many links render as plain tabs; beyond it, the overflow folds into the "more" sheet. */
const MORE_THRESHOLD = 5;

const TAB_CLASS =
  "flex h-16 w-full flex-col items-center justify-center gap-0.5 px-1 text-center text-[10px] font-medium leading-tight transition";

/** href of the link that best matches the current path (longest prefix wins), or null. */
function matchActiveHref(pathname: string, links: NavItem[]): string | null {
  let best: string | null = null;
  let bestLen = -1;
  for (const link of links) {
    const isMatch =
      link.href === pathname || pathname.startsWith(link.href + "/");
    if (isMatch && link.href.length > bestLen) {
      best = link.href;
      bestLen = link.href.length;
    }
  }
  return best;
}

/**
 * Bottom navigation for authenticated shells (shop / admin), shown on every
 * screen size — mirrors the customer-facing CustomerTabBar. Shows the first few
 * links as tabs; any extras collapse into a slide-up "more" sheet.
 */
export function AppTabBar({ nav }: { nav: keyof typeof NAVS }) {
  const t = useTranslations("layout");
  const links: NavItem[] = NAVS[nav];
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const activeHref = matchActiveHref(pathname, links);
  const hasMore = links.length > MORE_THRESHOLD;
  const primary = hasMore ? links.slice(0, 4) : links;
  const overflow = hasMore ? links.slice(4) : [];
  const moreActive = overflow.some((l) => l.href === activeHref);

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
          activeHref={activeHref}
        />
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur print:hidden">
        <ul className="mx-auto flex max-w-2xl items-stretch pb-[env(safe-area-inset-bottom)]">
          {primary.map((link) => {
            const Icon = link.icon;
            const isActive = link.href === activeHref;
            return (
              <li key={link.href} className="flex-1">
                <Link
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    TAB_CLASS,
                    isActive
                      ? "text-brand-600"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="line-clamp-2">{t(link.label)}</span>
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
                <MoreHorizontal className="size-5 shrink-0" />
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
  activeHref,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  activeHref: string | null;
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
          <p className="mb-2 px-1 text-xs font-medium text-muted">{t("navMore")}</p>
          <ul className="flex flex-col">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === activeHref;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition",
                      isActive
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
