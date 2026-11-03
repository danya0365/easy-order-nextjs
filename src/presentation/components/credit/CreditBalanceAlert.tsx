import Link from "next/link";
import { AlertTriangle, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { CreditStatus } from "@/src/application/services/CreditService";
import { satangToBaht } from "@/src/presentation/lib/money";
import { CreditLevelBadge } from "./CreditBits";

/** Dashboard card on /shop: balance + level + top-up CTA. */
export async function CreditDashCard({ status }: { status: CreditStatus }) {
  if (!status.enabled) return null;
  const t = await getTranslations("credit");
  const { level } = status.gate;
  const amount = satangToBaht(status.balanceSatang);
  const warn = level === "low" ? t("lowWarn", { amount }) : level === "empty" ? t("emptyWarn", { amount }) : level === "blocked" ? t("blockedWarn", { amount }) : null;
  const surface = level === "ok" ? "bg-card ring-border" : level === "low" ? "bg-warning-surface ring-border" : "bg-error-surface ring-border";
  return (
    <Link href="/shop/credit" data-testid="credit-dash-card" className={`flex items-center gap-3 rounded-2xl p-4 shadow-sm ring-1 ${surface}`}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
        <Wallet className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-xs text-muted">
          {t("balance")} <CreditLevelBadge level={level} />
        </span>
        <span className="block text-xl font-bold tabular-nums text-foreground">{t("baht", { amount })}</span>
        {warn && (
          <span className={`mt-0.5 flex items-start gap-1 text-xs ${level === "low" ? "text-warning" : "text-error"}`}>
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {warn}
          </span>
        )}
      </span>
      <span className="shrink-0 rounded-xl bg-brand-500 px-3 py-2 text-xs font-semibold text-on-brand">{t("topupCta")}</span>
    </Link>
  );
}

/** Compact header pill (balance), tinted by level. */
export async function CreditHeaderBadge({ status }: { status: CreditStatus }) {
  if (!status.enabled) return null;
  const t = await getTranslations("credit");
  const { level } = status.gate;
  const tone = level === "ok" ? "text-foreground ring-border" : level === "low" ? "bg-warning-surface text-warning ring-border" : "bg-error-surface text-error ring-border";
  return (
    <Link
      href="/shop/credit"
      data-testid="credit-header-badge"
      data-level={level}
      aria-label={`${t("balance")} ${satangToBaht(status.balanceSatang)}`}
      className={`inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-xs font-semibold tabular-nums ring-1 ${tone}`}
    >
      <Wallet className="size-4" />
      {satangToBaht(status.balanceSatang).replace(/\.00$/, "")}
      {level !== "ok" && <span className="size-2 rounded-full bg-current" aria-hidden />}
    </Link>
  );
}

/**
 * Layout-wide strip shown when credit is low / empty / blocked (replaces the
 * old subscription suspension + daily-fee nag banners). Hidden when ok/off.
 */
export async function CreditLowBanner({ status }: { status: CreditStatus }) {
  if (!status.enabled || status.gate.level === "ok") return null;
  const t = await getTranslations("credit");
  const { level } = status.gate;
  const amount = satangToBaht(status.balanceSatang);
  const msg = level === "low" ? t("lowWarn", { amount }) : level === "empty" ? t("emptyWarn", { amount }) : t("blockedWarn", { amount });
  return (
    <Link
      href="/shop/credit"
      data-testid="credit-low-banner"
      data-level={level}
      className={`flex items-center gap-2 px-4 py-2 text-sm text-foreground ${level === "low" ? "bg-warning-surface" : "bg-error-surface"}`}
    >
      <AlertTriangle className={`size-4 shrink-0 ${level === "low" ? "text-warning" : "text-error"}`} />
      <span className="min-w-0 flex-1">{msg}</span>
      <span className="shrink-0 font-semibold text-brand-600">{t("topupCta")}</span>
    </Link>
  );
}
