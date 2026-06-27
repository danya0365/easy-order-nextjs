"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Store, History, BookOpen, Info, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/src/presentation/components/ui/cn";

interface Tab {
  href: string;
  /** A `layout`-namespace message key (resolved with `t()`). */
  label: "navMap" | "navMyCards" | "navShops" | "navTutorial" | "navAbout";
  icon: LucideIcon;
  /** Returns true when this tab should appear active for the given pathname. */
  active: (pathname: string) => boolean;
}

// Discovery first (map + directory), then the customer's own order history;
// help/about are rarely used → last.
const TABS: Tab[] = [
  {
    href: "/",
    label: "navMap",
    icon: Map,
    active: (p) => p === "/",
  },
  {
    href: "/shops",
    label: "navShops",
    icon: Store,
    active: (p) => p.startsWith("/shops"),
  },
  {
    href: "/me",
    label: "navMyCards",
    icon: History,
    active: (p) => p === "/me" || p.startsWith("/me/") || p.startsWith("/s/"),
  },
  {
    href: "/tutorial",
    label: "navTutorial",
    icon: BookOpen,
    active: (p) => p.startsWith("/tutorial"),
  },
  {
    href: "/info",
    label: "navAbout",
    icon: Info,
    active: (p) => p.startsWith("/info"),
  },
];

/** Bottom navigation for customer-facing public pages. */
export function CustomerTabBar() {
  const t = useTranslations("layout");
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur print:hidden">
      <ul className="mx-auto flex max-w-md items-stretch pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
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
