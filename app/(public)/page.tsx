import { getTranslations } from "next-intl/server";

import { getSession } from "@/src/infrastructure/auth/session";
import { ROLE_HOME } from "@/src/domain/types/roles";
import { AdminEntryButton } from "@/src/presentation/components/auth/AdminEntryButton";
import { Logo } from "@/src/presentation/components/layout/Logo";
import { BRAND } from "@/src/config/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSession();
  const t = await getTranslations("publicPages");

  // Logged-in operators skip the /login round-trip and go straight to their
  // dashboard; everyone else goes to the login form.
  const entry = user
    ? { href: ROLE_HOME[user.role], label: t("goToDashboard") }
    : { href: "/login", label: t("adminLogin") };

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Logo className="size-10 shrink-0 rounded-xl sm:size-12" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              {BRAND.name}
            </h1>
            <p className="truncate text-xs text-muted sm:text-sm">
              {t("tagline")}
            </p>
          </div>
        </div>
        <AdminEntryButton href={entry.href} label={entry.label} />
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <Logo className="size-20 rounded-2xl" />
        <h2 className="text-2xl font-bold text-foreground">{BRAND.name}</h2>
        <p className="max-w-md text-muted">{BRAND.tagline}</p>
      </section>
    </main>
  );
}
