"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ImageUp, QrCode } from "lucide-react";

import type { CreditTopupPackage } from "@/src/domain/services/credit";
import { creditTopupQuoteAction, submitCreditTopupAction, type CreditFormState, type CreditQuoteResult } from "@/src/presentation/actions/credit-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { satangToBaht } from "@/src/presentation/lib/money";

export function CreditTopupForm({ packages, allowCustom, minSatang }: { packages: CreditTopupPackage[]; allowCustom: boolean; minSatang: number }) {
  const t = useTranslations("credit");
  const [pkg, setPkg] = useState<string | null>(packages[0]?.id ?? null);
  const [custom, setCustom] = useState("");
  const [quote, setQuote] = useState<CreditQuoteResult | null>(null);
  const [state, action, pending] = useActionState<CreditFormState, FormData>(submitCreditTopupAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const amountBaht = pkg ? null : Number(custom);
    const empty = !pkg && (!custom || !(amountBaht! > 0));
    let live = true;
    const h = setTimeout(async () => {
      if (empty) {
        if (live) setQuote(null);
        return;
      }
      const q = await creditTopupQuoteAction({ packageId: pkg, amountBaht });
      if (live) setQuote(q);
    }, 250);
    return () => {
      live = false;
      clearTimeout(h);
    };
  }, [pkg, custom]);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  const chip = (on: boolean) => `relative flex flex-col items-start rounded-xl p-3 text-left ring-1 transition ${on ? "bg-brand-50 ring-2 ring-brand-500" : "bg-card ring-border hover:bg-muted-surface"}`;

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4" data-testid="credit-topup-form">
      <input type="hidden" name="packageId" value={pkg ?? ""} />
      {packages.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {packages.map((p) => (
            <button type="button" key={p.id} className={chip(pkg === p.id)} onClick={() => { setPkg(p.id); setCustom(""); }} data-testid={`credit-pkg-${p.id}`}>
              {pkg === p.id && <Check className="absolute right-2 top-2 size-4 text-brand-700" />}
              <span className="text-base font-bold text-foreground">฿{satangToBaht(p.amountSatang).replace(/\.00$/, "")}</span>
              {p.bonusPercent > 0 && <span className="text-[11px] font-medium text-success">{t("packageBonus", { percent: p.bonusPercent })}</span>}
            </button>
          ))}
        </div>
      )}
      {allowCustom && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground">{t("customAmount")}</span>
          <input
            name="amountBaht"
            inputMode="decimal"
            type="number"
            min={minSatang / 100}
            step="1"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              setPkg(e.target.value ? null : packages[0]?.id ?? null);
            }}
            onFocus={() => setPkg(null)}
            className="rounded-xl border border-border bg-card px-3 py-2.5 text-foreground"
            placeholder={String(minSatang / 100)}
          />
          <span className="text-xs text-muted">{t("minTopup", { amount: satangToBaht(minSatang) })}</span>
        </label>
      )}

      {quote && !quote.ok && <p className="rounded-lg bg-error-surface px-3 py-2 text-sm text-error">{quote.error}</p>}
      {quote?.ok && (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-muted-surface p-4" data-testid="credit-quote">
          <div className="grid w-full grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-xs text-muted">{t("youPay")}</p>
              <p className="text-lg font-bold tabular-nums text-foreground">฿{satangToBaht(quote.amountSatang)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t("youGet")}</p>
              <p className="text-lg font-bold tabular-nums text-success">฿{satangToBaht(quote.amountSatang + quote.bonusSatang)}</p>
            </div>
          </div>
          {quote.qrDataUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={quote.qrDataUrl} alt="PromptPay QR" className="size-48 rounded-xl bg-white p-2" />
              <p className="flex items-center gap-1 text-xs text-muted"><QrCode className="size-3.5" /> {t("scanToPay")} · {t("promptpayTo", { id: quote.target })}</p>
            </>
          ) : (
            <p className="text-xs text-warning">{t("noPromptpay")}</p>
          )}
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-foreground">{t("slip")}</span>
        <span className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-card px-3 py-3">
          <ImageUp className="size-5 text-muted" />
          <input name="slip" type="file" accept="image/png,image/jpeg,image/webp,image/heic" required className="min-w-0 flex-1 text-sm text-foreground" data-testid="credit-slip-input" />
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-foreground">{t("note")}</span>
        <input name="note" maxLength={300} className="rounded-xl border border-border bg-card px-3 py-2.5 text-foreground" />
      </label>
      {state.error && <p className="rounded-lg bg-error-surface px-3 py-2 text-sm text-error">{state.error}</p>}
      {state.success && <p className="rounded-lg bg-success-surface px-3 py-2 text-sm text-success" data-testid="credit-topup-success">{state.success}</p>}
      <Button type="submit" loading={pending} fullWidth data-testid="credit-topup-submit">
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
