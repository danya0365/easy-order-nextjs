import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getSession, getKnownAccounts } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { isDevLoginEnabled } from "@/src/infrastructure/config/env";
import { ROLE_HOME } from "@/src/domain/types/roles";
import { LoginForm } from "@/src/presentation/components/auth/LoginForm";
import { DevLoginPanel } from "@/src/presentation/components/auth/DevLoginPanel";
import { PublicContactButton } from "@/src/presentation/components/auth/PublicContactButton";
import { AppVersion } from "@/src/presentation/components/layout/AppVersion";
import { Logo } from "@/src/presentation/components/layout/Logo";
import { BRAND } from "@/src/config/brand";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: t("loginMetaTitle", { brand: BRAND.name }),
    // Auth page — keep it out of search indexes.
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect(ROLE_HOME[user.role]);
  const t = await getTranslations("auth");

  // Accounts previously used on this device — offered as one-tap picks.
  const knownAccounts = await getKnownAccounts();

  // DEV ONLY — fetch the user list for the quick-login switcher (local only).
  const devUsers = isDevLoginEnabled
    ? (await container.userRepository.list()).map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
      }))
    : [];

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-sm ring-1 ring-border">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 inline-flex rounded-xl bg-white p-3 shadow-sm ring-1 ring-border">
            <Logo variant="wordmark" className="h-10 w-auto" />
          </span>
          <p className="text-sm text-muted">{t("loginAdminSubtitle")}</p>
        </div>
        <LoginForm knownAccounts={knownAccounts} />

        {isDevLoginEnabled && <DevLoginPanel users={devUsers} />}

        {/* Placeholder for future social login (Google / LINE) — not wired yet. */}
        <div className="mt-6">
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            {t("or")}
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {(["Google", "LINE"] as const).map((provider) => (
              <button
                key={provider}
                type="button"
                disabled
                title={t("comingSoon")}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted opacity-60"
              >
                {t("loginWithProvider", { provider })}
                <span className="rounded-full bg-muted-surface px-1.5 py-0.5 text-[10px]">
                  {t("comingSoon")}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-4 text-center">
          <PublicContactButton label={t("loginContactHelp")} />
          <Link
            href="/tutorial"
            className="mt-3 block text-sm font-medium text-brand-700 hover:underline"
          >
            {t("seeTutorial")}
          </Link>
        </div>
      </div>
      <AppVersion />
    </main>
  );
}
