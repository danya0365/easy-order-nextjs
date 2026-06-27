"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { Copy, Check, Download, Printer, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/src/presentation/components/ui/Button";
import { useToast } from "@/src/presentation/components/ui/Toast";
import { exportPosterPng } from "@/src/presentation/lib/poster-export";
import type { ShopHandoff } from "@/src/presentation/lib/shop-handoff";

type CopyKey = "email" | "password" | "all";

/**
 * Owner login URL + QR, email, and password — formatted so the admin can copy,
 * download as an image, or print and hand it over.
 *
 * Two modes:
 *  - default: right after a shop is created, with the plaintext password (shown
 *    once, not stored).
 *  - `passwordPlaceholder`: for an EXISTING shop, where the password can't be
 *    shown (only a hash is stored). The password becomes a blank line to write
 *    by hand, and the copy-password / copy-all buttons are hidden.
 */
export function ShopCredentialsHandoff({
  handoff,
  passwordPlaceholder = false,
}: {
  handoff: ShopHandoff;
  passwordPlaceholder?: boolean;
}) {
  const t = useTranslations("admin");
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<CopyKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const allText = t("schAllText", {
    shop: handoff.shopName,
    login: handoff.loginUrl,
    email: handoff.ownerEmail,
    password: handoff.ownerPassword,
  });

  async function copy(key: CopyKey, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.success(t("schCopied"));
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError(t("schCopyFailed"));
      toast.error(t("schCopyFailedToast"));
    }
  }

  async function download() {
    if (!cardRef.current) return;
    setBusy(true);
    setError(null);
    try {
      await exportPosterPng(cardRef.current, `${handoff.slug}-login`, {
        pixelRatio: 2,
      });
    } catch {
      setError(t("schExportFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Printable / exportable card. The captured node has a FIXED width and no
          auto-margins — html-to-image mis-handles mx-auto and would offset the
          snapshot — so centering lives on this outer wrapper instead. */}
      <div className="mx-auto w-85">
      <div
        ref={cardRef}
        className="flex w-85 flex-col items-center gap-4 rounded-2xl bg-card p-6 text-center ring-1 ring-border"
      >
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600">
          <KeyRound className="size-4" />
          {t("schCredentialsTitle")}
        </p>
        <h2 className="text-xl font-bold text-foreground">{handoff.shopName}</h2>

        <img
          src={handoff.loginQrDataUrl}
          alt={t("schQrAlt")}
          width={200}
          height={200}
          className="h-44 w-44 object-contain"
        />
        <p className="text-xs text-muted">
          {t("schScanToOpen")}
          <br />
          <span className="break-all">{handoff.loginUrl}</span>
        </p>

        <dl className="w-full overflow-hidden rounded-xl bg-muted-surface text-left">
          <div className="flex flex-col gap-0.5 border-b border-border px-4 py-3">
            <dt className="text-xs font-medium text-muted">{t("schEmail")}</dt>
            <dd className="break-all font-mono text-sm text-foreground">
              {handoff.ownerEmail}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 px-4 py-3">
            <dt className="text-xs font-medium text-muted">{t("schPassword")}</dt>
            {passwordPlaceholder ? (
              <dd className="mt-1 h-6 border-b border-dashed border-muted" />
            ) : (
              <dd className="break-all font-mono text-sm text-foreground">
                {handoff.ownerPassword}
              </dd>
            )}
          </div>
        </dl>

        <p className="text-xs text-muted">
          {passwordPlaceholder ? (
            t("schPlaceholderNote")
          ) : (
            t.rich("schSaveNote", {
              strong: (chunks) => (
                <strong className="text-foreground">{chunks}</strong>
              ),
            })
          )}
        </p>
      </div>
      </div>

      {/* Actions (excluded from print + the exported image) */}
      <div className="flex flex-wrap justify-center gap-2 print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => copy("email", handoff.ownerEmail)}
        >
          {copied === "email" ? <Check className="size-4" /> : <Copy className="size-4" />}
          {t("schEmail")}
        </Button>
        {!passwordPlaceholder && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copy("password", handoff.ownerPassword)}
            >
              {copied === "password" ? <Check className="size-4" /> : <Copy className="size-4" />}
              {t("schPassword")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => copy("all", allText)}>
              {copied === "all" ? <Check className="size-4" /> : <Copy className="size-4" />}
              {t("schCopyAll")}
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" disabled={busy} onClick={download}>
          <Download className="size-4" />
          {busy ? t("schGenerating") : t("schDownloadPng")}
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="size-4" />
          {t("schPrint")}
        </Button>
      </div>

      {error && <p className="text-center text-sm text-error">{error}</p>}
    </div>
  );
}
