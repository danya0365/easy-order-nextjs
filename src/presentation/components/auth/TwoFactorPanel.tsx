"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Download, ShieldCheck, ShieldOff } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  beginTwoFactorSetupAction,
  confirmTwoFactorSetupAction,
  disableTwoFactorAction,
  regenerateRecoveryCodesAction,
  type TwoFactorSetupState,
} from "@/src/presentation/actions/auth-actions";
import { BRAND } from "@/src/config/brand";

const inputCls =
  "rounded-lg border border-border px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";
const btnCls =
  "rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-on-brand transition hover:bg-brand-700 disabled:opacity-60";
const secondaryBtnCls =
  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted-surface";

/** Admin 2FA (TOTP) enrollment + management panel. */
export function TwoFactorPanel({
  enabled,
  recoveryRemaining,
  redirectTo,
}: {
  enabled: boolean;
  /** How many unused recovery codes remain (shown when enabled). */
  recoveryRemaining?: number;
  /** Where to go after finishing enrollment (e.g. the mandatory setup gate). */
  redirectTo?: string;
}) {
  const t = useTranslations("auth");
  const [on, setOn] = useState(enabled);
  const [setup, setSetup] = useState<TwoFactorSetupState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Recovery-codes screen: require the user to save before continuing.
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const err = error && (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
  );

  /** Show a freshly-issued set of codes — resets the "saved" gate. */
  function showCodes(res: TwoFactorSetupState) {
    setSaved(false);
    setCopied(false);
    setSetup(res);
  }

  // --- Just finished enrolling / regenerating: save codes (GitHub-style) ---
  if (setup?.recoveryCodes) {
    const codes = setup.recoveryCodes;
    const asText =
      `${t("recoveryFileTitle", { brand: BRAND.name })}\n` +
      `${t("recoveryFileSubtitle")}\n\n` +
      codes.join("\n") +
      `\n`;

    function download() {
      const blob = new Blob([asText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "easy-stamp-recovery-codes.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSaved(true);
    }
    async function copy() {
      try {
        await navigator.clipboard.writeText(codes.join("\n"));
        setCopied(true);
      } catch {
        /* clipboard blocked — downloading still satisfies the save gate */
      }
      setSaved(true);
    }

    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-success">
          {setup.success ?? t("twofaEnabledSuccess")}
        </p>
        <p className="text-sm text-muted">
          <strong className="text-foreground">{t("saveRecoveryCodes")}</strong>{" "}
          {t("recoveryCodesHint")}
        </p>
        <ul className="grid grid-cols-2 gap-2 rounded-lg bg-muted-surface p-3 font-mono text-sm text-foreground">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <div className="flex gap-2">
          <button type="button" onClick={download} className={secondaryBtnCls}>
            <Download className="size-4" /> {t("downloadTxt")}
          </button>
          <button type="button" onClick={copy} className={secondaryBtnCls}>
            {copied ? (
              <>
                <Check className="size-4 text-success" /> {t("copied")}
              </>
            ) : (
              <>
                <Copy className="size-4" /> {t("copy")}
              </>
            )}
          </button>
        </div>
        <button
          type="button"
          disabled={!saved}
          className={btnCls}
          onClick={() => {
            if (redirectTo) {
              window.location.assign(redirectTo);
              return;
            }
            setSetup(null);
            setOn(true);
          }}
        >
          {saved ? t("continue") : t("saveCodesFirst")}
        </button>
      </div>
    );
  }

  // --- Already on: remaining codes + regenerate + disable ---
  if (on) {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-1.5 text-sm font-medium text-success">
          <ShieldCheck className="size-4" /> {t("twofaOn")}
          {typeof recoveryRemaining === "number" && (
            <span className="font-normal text-muted">
              {t("recoveryRemaining", { count: recoveryRemaining })}
            </span>
          )}
        </p>

        <form
          className="flex flex-col gap-2"
          action={(fd) =>
            start(async () => {
              setError(null);
              const res = await regenerateRecoveryCodesAction({}, fd);
              if (res.error) setError(res.error);
              else showCodes(res);
            })
          }
        >
          <label className="text-sm text-muted">{t("regenerateLabel")}</label>
          <input
            name="password"
            type="password"
            required
            placeholder={t("confirmPasswordPlaceholder")}
            className={inputCls}
          />
          <button type="submit" disabled={pending} className={`${btnCls} text-sm`}>
            {t("regenerateButton")}
          </button>
        </form>

        <form
          className="flex flex-col gap-2 border-t border-border pt-3"
          action={(fd) =>
            start(async () => {
              setError(null);
              const res = await disableTwoFactorAction({}, fd);
              if (res.error) setError(res.error);
              else setOn(false);
            })
          }
        >
          <label className="text-sm text-muted">{t("disableLabel")}</label>
          <input name="password" type="password" required className={inputCls} />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-error px-4 py-2 text-sm font-medium text-error hover:bg-error/5 disabled:opacity-60"
          >
            <ShieldOff className="size-4" /> {t("disableButton")}
          </button>
        </form>
        {err}
      </div>
    );
  }

  // --- Enrolling: show QR + secret + confirm code ---
  if (setup?.qrDataUrl) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">{t("scanQrHint")}</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- QR is an inline data URL */}
        <img
          src={setup.qrDataUrl}
          alt={t("qrAlt")}
          className="mx-auto size-44 rounded-lg border border-border"
        />
        <code className="break-all rounded-lg bg-muted-surface px-3 py-2 text-center text-xs text-foreground">
          {setup.secret}
        </code>
        <form
          className="flex flex-col gap-2"
          action={(fd) =>
            start(async () => {
              setError(null);
              const res = await confirmTwoFactorSetupAction({}, fd);
              if (res.error) setError(res.error);
              else showCodes(res);
            })
          }
        >
          <input
            name="code"
            inputMode="numeric"
            maxLength={6}
            required
            placeholder={t("codePlaceholder")}
            className={`${inputCls} text-center tracking-[0.3em]`}
          />
          {err}
          <button type="submit" disabled={pending} className={btnCls}>
            {pending ? t("confirming") : t("confirmEnable2fa")}
          </button>
        </form>
      </div>
    );
  }

  // --- Off: offer to start ---
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{t("enable2faIntro")}</p>
      {err}
      <button
        type="button"
        disabled={pending}
        className={btnCls}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await beginTwoFactorSetupAction();
            if (res.error) setError(res.error);
            else setSetup(res);
          })
        }
      >
        {pending ? t("preparing") : t("start2faSetup")}
      </button>
    </div>
  );
}
