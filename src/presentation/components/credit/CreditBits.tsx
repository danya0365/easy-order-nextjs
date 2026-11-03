import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { CreditLedgerEntry, CreditTopupStatus } from "@/src/application/repositories/ICreditRepository";
import type { CreditLevel, EffectiveCreditConfig } from "@/src/domain/services/credit";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { satangToBaht } from "@/src/presentation/lib/money";
import { formatDateTime } from "@/src/presentation/lib/format-date";

export const CREDIT_PAGE_SIZE = 20;

export function pageParam(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/** Signed baht amount, green for credit / red for debit. */
export function CreditAmount({ satang, className = "" }: { satang: number; className?: string }) {
  const tone = satang > 0 ? "text-success" : satang < 0 ? "text-error" : "text-muted";
  return (
    <span className={`font-semibold tabular-nums ${tone} ${className}`}>
      {satang > 0 ? "+" : satang < 0 ? "−" : ""}
      {satangToBaht(Math.abs(satang))}
    </span>
  );
}

export async function CreditLevelBadge({ level }: { level: CreditLevel }) {
  const t = await getTranslations("credit");
  const map = { ok: ["success", "levelOk"], low: ["warning", "levelLow"], empty: ["danger", "levelEmpty"], blocked: ["danger", "levelBlocked"] } as const;
  const [tone, key] = map[level];
  return <Badge tone={tone}>{t(key)}</Badge>;
}

export async function TopupStatusBadge({ status }: { status: CreditTopupStatus }) {
  const t = await getTranslations("credit");
  const tone = status === "approved" ? "success" : status === "rejected" ? "danger" : "warning";
  const key = status === "approved" ? "statusApproved" : status === "rejected" ? "statusRejected" : "statusPending";
  return <Badge tone={tone}>{t(key)}</Badge>;
}

/** Numbered pager that preserves other query params. */
export async function Pager({ basePath, page, total, pageSize, params = {} }: { basePath: string; page: number; total: number; pageSize: number; params?: Record<string, string | undefined> }) {
  const t = await getTranslations("credit");
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const btn = "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm ring-1 ring-border";
  return (
    <nav className="mt-4 flex items-center justify-between gap-2" aria-label="pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${btn} text-foreground hover:bg-muted-surface`}>
          <ChevronLeft className="size-4" /> {t("prev")}
        </Link>
      ) : (
        <span className={`${btn} text-muted opacity-50`}><ChevronLeft className="size-4" /> {t("prev")}</span>
      )}
      <span className="text-xs text-muted">{t("pageOf", { page, pages })}</span>
      {page < pages ? (
        <Link href={href(page + 1)} className={`${btn} text-foreground hover:bg-muted-surface`}>
          {t("next")} <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={`${btn} text-muted opacity-50`}>{t("next")} <ChevronRight className="size-4" /></span>
      )}
    </nav>
  );
}

export async function CreditLedgerList({ items, hrefFor }: { items: CreditLedgerEntry[]; hrefFor: (e: CreditLedgerEntry) => string }) {
  const t = await getTranslations("credit");
  if (items.length === 0) return <p className="py-6 text-center text-sm text-muted">{t("noLedger")}</p>;
  return (
    <ul className="flex flex-col divide-y divide-border" data-testid="credit-ledger">
      {items.map((e) => (
        <li key={e.id}>
          <Link href={hrefFor(e)} className="flex items-center gap-3 py-3 hover:bg-muted-surface/50">
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${e.amountSatang >= 0 ? "bg-success-surface text-success" : "bg-error-surface text-error"}`}>
              {e.amountSatang >= 0 ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{t(`type_${e.type}`)}</span>
              <span className="block truncate text-xs text-muted">{e.reason ?? "—"} · {formatDateTime(e.createdAt)}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end">
              <CreditAmount satang={e.amountSatang} className="text-sm" />
              <span className="text-[11px] text-muted">{t("balanceAfter", { amount: satangToBaht(e.balanceAfterSatang) })}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Type filter chips for ledgers. */
export async function LedgerTypeFilter({ basePath, current }: { basePath: string; current: string | null }) {
  const t = await getTranslations("credit");
  const types = ["topup", "deduction", "refund", "adjust", "bonus", "starting"] as const;
  const chip = (active: boolean) => `whitespace-nowrap rounded-full px-3 py-1 text-xs ring-1 ${active ? "bg-brand-500 text-on-brand ring-brand-500" : "text-foreground ring-border hover:bg-muted-surface"}`;
  return (
    <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
      <Link href={basePath} className={chip(!current)}>{t("filterAll")}</Link>
      {types.map((ty) => (
        <Link key={ty} href={`${basePath}?type=${ty}`} className={chip(current === ty)}>{t(`type_${ty}`)}</Link>
      ))}
    </div>
  );
}

export async function CreditRuleSummary({ config }: { config: EffectiveCreditConfig }) {
  const t = await getTranslations("credit");
  const d = config.deduction;
  const lb = config.lowBalance;
  const fee = satangToBaht(d.fixedSatang);
  const rule =
    d.mode === "fixed" ? t("ruleFixed", { fee }) : d.mode === "percent" ? t("rulePercent", { percent: d.percent }) : d.mode === "fixed_percent" ? t("ruleFixedPercent", { fee, percent: d.percent }) : t("ruleTiered");
  const trig = d.trigger === "placed" ? t("triggerPlaced") : d.trigger === "accepted" ? t("triggerAccepted") : t("triggerCompleted");
  const low = lb.mode === "warn" ? t("lowModeWarn") : lb.mode === "block" ? t("lowModeBlock") : t("lowModeGrace", { orders: lb.graceOrders || "∞", neg: lb.negativeLimitSatang ? satangToBaht(lb.negativeLimitSatang) : "∞" });
  return (
    <ul className="flex flex-col gap-1 text-sm text-foreground" data-testid="credit-rule">
      <li className="font-medium">{rule}</li>
      {d.mode === "tiered" && d.tiers.map((x, i) => <li key={i} className="pl-3 text-xs text-muted">{t("tierRow", { min: satangToBaht(x.minTotalSatang), fee: satangToBaht(x.feeSatang) })}</li>)}
      {(d.minSatang > 0 || d.maxSatang > 0) && <li className="text-xs text-muted">{t("ruleMinMax", { min: satangToBaht(d.minSatang), max: d.maxSatang ? satangToBaht(d.maxSatang) : "∞" })}</li>}
      {(d.freePerDay > 0 || d.freePerMonth > 0) && <li className="text-xs text-muted">{t("ruleFree", { day: d.freePerDay, month: d.freePerMonth })}</li>}
      <li className="text-xs text-muted">{trig} · {d.refundOnCancel ? t("refundOn") : t("refundOff")}</li>
      <li className="text-xs text-muted">{low}</li>
    </ul>
  );
}
