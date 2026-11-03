import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getSession } from "@/src/infrastructure/auth/session";
import { ROLE_HOME } from "@/src/domain/types/roles";
import { AdminEntryButton } from "@/src/presentation/components/auth/AdminEntryButton";
import { Logo } from "@/src/presentation/components/layout/Logo";
import { SiteHeader } from "@/src/presentation/components/layout/SiteHeader";
import { BRAND } from "@/src/config/brand";

/**
 * Platform (public) header: logo + brand (+ tagline on sm+), skin switcher,
 * and the operator entry (dashboard when signed in, else login).
 * getSession is request-memoized, so pages that also read it pay once.
 */
export async function PublicSiteHeader() {
  const [t, user] = await Promise.all([getTranslations("publicPages"), getSession()]);
  const entry = user
    ? { href: ROLE_HOME[user.role], label: t("goToDashboard") }
    : { href: "/login", label: t("adminLogin") };
  return (
    <SiteHeader
      sticky
      left={
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <Logo className="size-8 shrink-0 rounded-lg sm:size-9" />
          <span className="min-w-0">
            <span className="block whitespace-nowrap font-bold text-foreground sm:text-lg">{BRAND.name}</span>
            <span className="hidden truncate text-xs text-muted sm:block">{t("tagline")}</span>
          </span>
        </Link>
      }
      trailing={<AdminEntryButton href={entry.href} label={entry.label} />}
    />
  );
}
