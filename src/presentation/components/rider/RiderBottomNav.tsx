"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, UserRound, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";

const TABS = [
  { href: "/rider", key: "tabJobs", Icon: ClipboardList },
  { href: "/rider/earnings", key: "tabEarnings", Icon: Wallet },
  { href: "/rider/me", key: "tabMe", Icon: UserRound },
] as const;

/** Rider app bottom tab bar — large touch targets, safe-area aware. */
export function RiderBottomNav() {
  const t = useTranslations("rider");
  const path = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
      data-testid="rider-nav"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {TABS.map(({ href, key, Icon }) => {
          const active = href === "/rider" ? path === "/rider" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-sm font-medium ${
                  active ? "text-brand-700" : "text-muted"
                }`}
              >
                <Icon className="size-6" />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
