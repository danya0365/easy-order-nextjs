/* eslint-disable @next/next/no-img-element */
"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import { useTranslations } from "next-intl";

import {
  submitSlipAction,
  topupQuoteAction,
  type BillingFormState,
} from "@/src/presentation/actions/billing-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { useActionToast } from "@/src/presentation/hooks/useActionToast";
import {
  TOPUP_PRESETS,
  TOPUP_PROMO,
  isPromoActive,
  resolveTopupQuote,
  computeSavingsPercent,
  MIN_CUSTOM_DAYS,
  MAX_CUSTOM_DAYS,
  type TopupQuote,
} from "@/src/domain/services/topup-pricing";
import { satangToBaht } from "@/src/presentation/lib/money";

type Selection = { kind: "preset"; id: string } | { kind: "custom" };

const BADGE_KEY: Record<
  NonNullable<(typeof TOPUP_PRESETS)[number]["badge"]>,
  "badgePopular" | "badgeBestValue"
> = {
  popular: "badgePopular",
  best_value: "badgeBestValue",
};

export function TopupForm({
  pricePerDaySatang,
}: {
  pricePerDaySatang: number;
}) {
  const t = useTranslations("billing");
  const [selection, setSelection] = useState<Selection>({
    kind: "preset",
    id: "d180",
  });
  const [customDays, setCustomDays] = useState("90");
  const [qr, setQr] = useState<{
    amountSatang: number;
    fullAmountSatang: number;
    promoPercentOff: number;
    qrDataUrl: string;
    target: string;
  } | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrPending, startQr] = useTransition();
  const [state, action, pending] = useActionState<BillingFormState, FormData>(
    submitSlipAction,
    {},
  );
  useActionToast(state);
  const slipRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [slipNote, setSlipNote] = useState<string | null>(null);

  // Shrink the slip in the browser before it ever hits the server action:
  // cap to 2000×2000 and re-encode as JPEG, so large phone photos don't blow
  // past Next's server-action body limit.
  async function onPickSlip(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setSlipNote(null);
      return;
    }
    setCompressing(true);
    setSlipNote(t("compressing"));
    try {
      const { default: imageCompression } = await import(
        "browser-image-compression"
      );
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 2000,
        maxSizeMB: 1,
        useWebWorker: true,
        fileType: "image/jpeg",
      });
      const baseName = file.name.replace(/\.[^.]+$/, "") || "slip";
      const named = new File([compressed], `${baseName}.jpg`, {
        type: "image/jpeg",
      });
      const dt = new DataTransfer();
      dt.items.add(named);
      if (slipRef.current) slipRef.current.files = dt.files;
      setSlipNote(t("slipReady", { kb: Math.round(named.size / 1024) }));
    } catch {
      // Couldn't process (e.g. unsupported format) — send the original as-is.
      setSlipNote(null);
    } finally {
      setCompressing(false);
    }
  }

  const packageId = selection.kind === "preset" ? selection.id : null;
  const customDaysNum = selection.kind === "custom" ? Number(customDays) : null;

  // Instant client-side preview (the server QR confirms the authoritative amount).
  let preview: TopupQuote | null = null;
  let previewError: string | null = null;
  try {
    preview = resolveTopupQuote({ packageId, customDays: customDaysNum }, pricePerDaySatang);
  } catch (e) {
    previewError = (e as Error).message;
  }
  const savings = preview ? computeSavingsPercent(preview, pricePerDaySatang) : 0;

  // Fetch the matching QR whenever the (valid) selection changes.
  useEffect(() => {
    const delay = selection.kind === "custom" ? 400 : 0;
    const handle = setTimeout(() => {
      if (previewError) {
        setQr(null);
        return;
      }
      startQr(async () => {
        const res = await topupQuoteAction({ packageId, customDays: customDaysNum });
        if (res.ok) {
          setQr({
            amountSatang: res.amountSatang,
            fullAmountSatang: res.fullAmountSatang,
            promoPercentOff: res.promoPercentOff,
            qrDataUrl: res.qrDataUrl,
            target: res.target,
          });
          setQrError(null);
        } else {
          setQr(null);
          setQrError(res.error);
        }
      });
    }, delay);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId, customDaysNum, previewError]);

  const promoOn = isPromoActive();

  return (
    <div className="flex flex-col gap-4">
      {/* Launch promo banner */}
      {promoOn && (
        <div className="rounded-2xl bg-accent-500 px-4 py-3 text-white">
          <p className="text-sm font-bold">🎉 {t("promoLabel", { percent: TOPUP_PROMO.percentOff })}</p>
          <p className="text-xs opacity-90">{t("promoSubtitle")}</p>
        </div>
      )}

      {/* Preset packages */}
      <div className="grid grid-cols-2 gap-2">
        {TOPUP_PRESETS.map((p) => {
          const q = resolveTopupQuote({ packageId: p.id }, pricePerDaySatang);
          const pct = computeSavingsPercent(q, pricePerDaySatang);
          const selected = selection.kind === "preset" && selection.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelection({ kind: "preset", id: p.id })}
              className={`relative flex flex-col gap-0.5 rounded-2xl p-3 text-left ring-1 transition ${
                selected
                  ? "bg-brand-50 ring-2 ring-brand-500"
                  : "bg-card ring-border hover:ring-brand-300"
              }`}
            >
              {q.promoPercentOff > 0 ? (
                <span className="absolute -top-2 right-2 rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-medium text-white">
                  {t("discountPercent", { pct: q.promoPercentOff })}
                </span>
              ) : (
                p.badge && (
                  <span className="absolute -top-2 right-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-medium text-on-brand">
                    {t(BADGE_KEY[p.badge])}
                  </span>
                )
              )}
              <span className="text-base font-bold text-foreground">{t("daysValue", { days: p.days })}</span>
              {p.bonusDays > 0 ? (
                <span className="text-xs font-medium text-success">
                  {t("presetBonus", { days: p.bonusDays })}
                </span>
              ) : (
                <span className="text-xs text-muted">&nbsp;</span>
              )}
              <span className="mt-1 flex items-baseline gap-1.5">
                {q.promoPercentOff > 0 && (
                  <span className="text-xs text-muted line-through">
                    ฿{satangToBaht(q.fullAmountSatang)}
                  </span>
                )}
                <span className="text-sm font-semibold text-foreground">
                  ฿{satangToBaht(q.amountSatang)}
                </span>
              </span>
              {q.promoPercentOff === 0 && pct > 0 && (
                <span className="text-xs text-brand-600">{t("savePercent", { pct })}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom days */}
      <button
        type="button"
        onClick={() => setSelection({ kind: "custom" })}
        className={`flex flex-col gap-2 rounded-2xl p-3 text-left ring-1 transition ${
          selection.kind === "custom"
            ? "bg-brand-50 ring-2 ring-brand-500"
            : "bg-card ring-border hover:ring-brand-300"
        }`}
      >
        <span className="text-sm font-medium text-foreground">
          {t("customDaysTitle")}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={MIN_CUSTOM_DAYS}
            max={MAX_CUSTOM_DAYS}
            value={customDays}
            onChange={(e) => {
              setCustomDays(e.target.value);
              setSelection({ kind: "custom" });
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-28 rounded-lg border border-border bg-card px-3 py-2 text-foreground outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <span className="text-sm text-muted">{t("daysUnit")}</span>
        </div>
        <span className="text-xs text-muted">{t("customDaysHint")}</span>
      </button>

      {/* Live preview */}
      {previewError ? (
        <p className="text-sm text-error">{previewError}</p>
      ) : preview ? (
        <div className="rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-100">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">{t("totalReceived")}</span>
            <span className="text-lg font-bold text-foreground">
              {t("daysValue", { days: preview.totalDays })}
            </span>
          </div>
          {preview.bonusDays > 0 && (
            <p className="text-xs text-success">
              {t("baseBonusBreakdown", {
                base: preview.baseDays,
                bonus: preview.bonusDays,
              })}
            </p>
          )}
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm text-muted">{t("amountDue")}</span>
            <span className="flex items-baseline gap-2">
              {preview.promoPercentOff > 0 && (
                <span className="text-sm text-muted line-through">
                  ฿{satangToBaht(preview.fullAmountSatang)}
                </span>
              )}
              <span className="text-2xl font-bold text-foreground">
                ฿{satangToBaht(preview.amountSatang)}
              </span>
            </span>
          </div>
          {preview.promoPercentOff > 0 ? (
            <p className="mt-1 text-right text-xs font-medium text-accent-600">
              {t("promoLaunchPrice", { pct: preview.promoPercentOff })}
            </p>
          ) : (
            savings > 0 && (
              <p className="mt-1 text-right text-xs font-medium text-brand-600">
                {t("cheaperThanMonthly", { pct: savings })}
              </p>
            )
          )}
        </div>
      ) : null}

      {/* QR + slip upload */}
      {preview && (
        <form action={action} className="flex flex-col items-center gap-3">
          <input type="hidden" name="packageId" value={packageId ?? ""} />
          <input
            type="hidden"
            name="customDays"
            value={customDaysNum ?? ""}
          />

          <div className="flex w-full flex-col items-center gap-2 rounded-2xl bg-muted-surface p-4">
            <span className="text-sm font-medium text-brand-700">
              {t("scanPromptPay")}
            </span>
            {qrPending || !qr ? (
              <div className="flex h-52 w-52 items-center justify-center rounded-xl bg-card text-sm text-muted">
                {qrError ?? t("generatingQr")}
              </div>
            ) : (
              <>
                <img
                  src={qr.qrDataUrl}
                  alt="PromptPay QR"
                  width={208}
                  height={208}
                  className="h-52 w-52 rounded-xl bg-card object-contain p-2 shadow-sm"
                />
                <p className="text-2xl font-bold text-foreground">
                  ฿{satangToBaht(qr.amountSatang)}
                </p>
                {qr.promoPercentOff > 0 && (
                  <p className="text-xs text-muted">
                    {t("normalPrice")}{" "}
                    <span className="line-through">
                      ฿{satangToBaht(qr.fullAmountSatang)}
                    </span>{" "}
                    · {t("discountPercent", { pct: qr.promoPercentOff })}
                  </p>
                )}
                <p className="text-xs text-muted">{t("promptpayTarget", { target: qr.target })}</p>
              </>
            )}
          </div>

          <div className="w-full">
            <p className="mb-2 text-sm text-muted">{t("transferThenAttach")}</p>
            <input
              ref={slipRef}
              type="file"
              name="slip"
              accept="image/png,image/jpeg,image/webp"
              required
              onChange={onPickSlip}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand-100 file:px-4 file:py-2 file:text-brand-700"
            />
            {slipNote && <p className="mt-1 text-xs text-muted">{slipNote}</p>}
            {state.error && (
              <p className="mt-2 text-sm text-error">{state.error}</p>
            )}
            {state.success && (
              <p className="mt-2 text-sm text-success">{state.success}</p>
            )}
            <Button
              type="submit"
              loading={pending || compressing}
              className="mt-3 w-full"
            >
              {pending
                ? t("submitting")
                : compressing
                  ? t("compressing")
                  : t("submitSlip")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
