import type { Metadata } from "next";
import { Link2Off, LogIn, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { ResolveOneTimeLoginLinkUseCase } from "@/src/application/use-cases/auth/OneTimeLoginUseCases";
import {
  isLinkPreviewUserAgent,
  maskEmail,
} from "@/src/domain/services/one-time-login";
import { getClientIp, getUserAgent } from "@/src/presentation/lib/request-ip";
import { OneTimeLoginChooser } from "@/src/presentation/components/auth/OneTimeLoginChooser";
import { Logo } from "@/src/presentation/components/layout/Logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "One-time login",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const ERROR_KEYS = {
  used: "oneTimeErrUsed",
  revoked: "oneTimeErrRevoked",
  expired: "oneTimeErrExpired",
  malformed: "oneTimeErrNotFound",
  not_found: "oneTimeErrNotFound",
  no_account: "oneTimeErrNoAccount",
  wrong_account: "oneTimeErrWrongAccount",
  rate_limited: "oneTimeErrRateLimited",
  forbidden: "oneTimeErrForbidden",
} as const;
type ErrorCode = keyof typeof ERROR_KEYS;
const isErrorCode = (e: unknown): e is ErrorCode =>
  typeof e === "string" && Object.prototype.hasOwnProperty.call(ERROR_KEYS, e);

/**
 * Viewing this page is side-effect free for the link: GET/HEAD, link-preview
 * bots, prefetchers and any number of browsers/devices may open it — nothing
 * is consumed, bound to a cookie or device. Only the POST to
 * /login/one-time/confirm consumes (atomically).
 */
export default async function OneTimeLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; e?: string }>;
}) {
  const { t: token, e } = await searchParams;
  const t = await getTranslations("auth");
  const errorCode = isErrorCode(e) ? e : null;

  // Link-preview bots: neutral card, no lookup, no throttle bookkeeping.
  if (isLinkPreviewUserAgent(await getUserAgent())) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
        <Logo />
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center">
          <LogIn className="size-8 text-brand-500" />
          <h1 className="text-lg font-semibold">{t("oneTimePreviewTitle")}</h1>
          <p className="text-sm text-muted">{t("oneTimePreviewDesc")}</p>
        </div>
      </main>
    );
  }

  // Light throttle on token probing (only unknown/garbled tokens count).
  const ip = await getClientIp();
  const seen = token ? await container.rateLimitRepository.peek(`otl:view:${ip}`) : null;
  const throttled = !!seen && seen.count >= 30;
  const check = !token
    ? ({ kind: "invalid", reason: "not_found" } as const)
    : throttled
      ? ({ kind: "invalid", reason: "not_found" } as const)
      : await new ResolveOneTimeLoginLinkUseCase(
          container.adminLoginLinkRepository,
          container.shopRepository,
          container.userRepository,
        ).execute(token);
  if (
    token &&
    !throttled &&
    check.kind === "invalid" &&
    (check.reason === "malformed" || check.reason === "not_found")
  ) {
    await container.rateLimitRepository.hit(`otl:view:${ip}`, 30, 10 * 60_000);
  }
  // A dead link shows its own state; with no token, show the redirected reason.
  const invalidMsg =
    check.kind === "invalid"
      ? t(ERROR_KEYS[!token && errorCode ? errorCode : check.reason])
      : null;
  const chooserError =
    check.kind !== "invalid" && errorCode ? t(ERROR_KEYS[errorCode]) : undefined;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <Logo />
      {check.kind === "invalid" ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center">
          <Link2Off className="size-8 text-error" />
          <h1 className="text-lg font-semibold">{t("oneTimeInvalidTitle")}</h1>
          <p className="text-sm text-muted">{invalidMsg}</p>
        </div>
      ) : check.kind === "admin" ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-brand-500" />
            <h1 className="text-lg font-semibold">{t("oneTimeAdminTitle")}</h1>
          </div>
          <p className="text-sm text-muted">{t("oneTimeAdminDesc")}</p>
          <OneTimeLoginChooser
            token={token!}
            error={chooserError}
            accounts={[
              {
                id: check.account.id,
                email: maskEmail(check.account.email),
                role: check.account.role,
              },
            ]}
          />
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
            error={chooserError}
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
