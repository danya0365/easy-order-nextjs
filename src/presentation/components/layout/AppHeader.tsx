import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

import { logoutAction } from "@/src/presentation/actions/auth-actions";
import { ThemeSwitcher } from "@/src/presentation/components/ThemeSwitcher";
import { Logo } from "@/src/presentation/components/layout/Logo";
import { BRAND } from "@/src/config/brand";

interface AppHeaderProps {
  /** App name, always shown. Defaults to the central brand name. */
  brand?: string;
  /** Role suffix shown only on sm+ (e.g. "ร้านค้า"). */
  role?: string;
  userEmail: string;
  /** Bell link + unread badge; omit to hide the bell (e.g. staff). */
  notifications?: { href: string; unread: number };
}

/**
 * Slim top bar: brand + notifications bell + theme switcher + account controls.
 * Navigation itself lives in the bottom tab bar (see AppTabBar) on every size.
 * On mobile the role suffix, email, and logout label collapse to save space.
 */
export function AppHeader({
  brand = BRAND.name,
  role,
  userEmail,
  notifications,
}: AppHeaderProps) {
  const t = useTranslations("layout");
  return (
    <header className="border-b border-border bg-card print:hidden">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <span className="flex min-w-0 items-center gap-2">
          <Logo className="size-8 shrink-0 rounded-lg" />
          <span className="shrink-0 whitespace-nowrap font-bold text-brand-700">
            {brand}
          </span>
          {role && (
            <span className="hidden truncate text-muted sm:inline">
              · {role}
            </span>
          )}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2 text-sm sm:gap-3">
          {notifications && (
            <Link
              href={notifications.href}
              aria-label={
                notifications.unread > 0
                  ? t("notificationsAriaUnread", { count: notifications.unread })
                  : t("notificationsAria")
              }
              className="relative inline-flex size-9 items-center justify-center rounded-lg text-foreground transition hover:bg-muted-surface"
            >
              <Bell className="size-5" />
              {notifications.unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold leading-4 text-on-brand">
                  {notifications.unread > 9 ? "9+" : notifications.unread}
                </span>
              )}
            </Link>
          )}
          <ThemeSwitcher />
          <span className="hidden max-w-56 truncate text-muted lg:inline">
            {userEmail}
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label={t("logout")}
              title={t("logout")}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border px-2.5 py-1.5 text-foreground transition hover:bg-muted-surface sm:px-3"
            >
              <LogOut className="size-4 shrink-0" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
