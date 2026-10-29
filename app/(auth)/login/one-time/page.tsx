import type { Metadata } from "next";
import { Link2Off, LogIn } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { ResolveOneTimeLoginLinkUseCase } from "@/src/application/use-cases/auth/OneTimeLoginUseCases";
import { maskEmail } from "@/src/domain/services/one-time-login";
import { getClientIp } from "@/src/presentation/lib/request-ip";
import { OneTimeLoginChooser } from "@/src/presentation/components/auth/OneTimeLoginChooser";
import { Logo } from "@/src/presentation/components/layout/Logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "One-time login",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function OneTimeLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t: token } = await searchParams;
  const t = await getTranslations("auth");

  // Light throttle on token probing (only failed lookups count).
  const ip = await getClientIp();
  const seen = await container.rateLimitRepository.peek(`otl:view:${ip}`);
  const throttled = !!seen && seen.count >= 30;
  const check = throttled
    ? ({ kind: "invalid" } as const)
    : await new ResolveOneTimeLoginLinkUseCase(
        container.adminLoginLinkRepository,
        container.shopRepository,
        container.userRepository,
      ).execute(token);
  if (check.kind === "invalid" && !throttled) {
    await container.rateLimitRepository.hit(`otl:view:${ip}`, 30, 10 * 60_000);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <Logo />
      {check.kind === "invalid" ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center">
          <Link2Off className="size-8 text-error" />
          <h1 className="text-lg font-semibold">{t("oneTimeInvalidTitle")}</h1>
          <p className="text-sm text-muted">{t("oneTimeInvalidDesc")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center gap-2">
            <LogIn className="size-5 text-brand-500" />
            <h1 className="text-lg font-semibold">
              {t("oneTimeTitle", { shop: check.shopName })}
            </h1>
          </div>
          <p className="text-sm text-muted">{t("oneTimeDesc")}</p>
          <OneTimeLoginChooser
            token={token!}
            accounts={check.accounts.map((u) => ({
              id: u.id,
              email: maskEmail(u.email),
              role: u.role,
            }))}
          />
        </div>
      )}
    </main>
  );
}
