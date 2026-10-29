"use client";

import { useActionState, useState, useTransition } from "react";
import { Copy, KeyRound, Link2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  createOneTimeLoginLinkAction,
  revokeOneTimeLoginLinkAction,
  type OneTimeLinkState,
} from "@/src/presentation/actions/one-time-login-actions";
import { Modal } from "@/src/presentation/components/ui/Modal";

export interface ActiveLinkView {
  id: string;
  expiresAt: string;
  target: string | null;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

/** Admin row action: issue / list / revoke one-time login links for a shop. */
export function OneTimeLoginLinkButton({
  shopId,
  accounts,
  activeLinks,
}: {
  shopId: string;
  accounts: { id: string; label: string }[];
  activeLinks: ActiveLinkView[];
}) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revoking, startRevoke] = useTransition();
  const [state, action, pending] = useActionState<OneTimeLinkState, FormData>(
    createOneTimeLoginLinkAction.bind(null, shopId),
    {},
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
      >
        <KeyRound className="size-3.5" />
        {t("otlButton")}
        {activeLinks.length > 0 && ` (${activeLinks.length})`}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("otlButton")}>
        <div className="flex flex-col gap-4 text-sm">
          <form action={action} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-medium">{t("otlExpiry")}</span>
              <select name="expiry" defaultValue="15m" className="rounded-lg border border-border bg-surface px-3 py-2">
                <option value="15m">{t("otlExpiry15m")}</option>
                <option value="1h">{t("otlExpiry1h")}</option>
                <option value="24h">{t("otlExpiry24h")}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium">{t("otlAccount")}</span>
              <select name="targetUserId" defaultValue="" className="rounded-lg border border-border bg-surface px-3 py-2">
                <option value="">{t("otlAccountAny")}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 font-semibold text-on-brand hover:bg-brand-600 disabled:opacity-60"
            >
              <Link2 className="size-4" />
              {t("otlCreate")}
            </button>
          </form>

          {state.error && <p className="text-error">{state.error}</p>}
          {state.url && (
            <div className="flex flex-col gap-2 rounded-xl border border-brand-500 bg-brand-50 p-3">
              <p className="text-xs text-muted">{t("otlShownOnce")}</p>
              <code className="break-all text-xs">{state.url}</code>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted">
                  {t("otlExpiresAt", { at: fmt(state.expiresAt!) })}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(state.url!);
                    setCopied(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"
                >
                  <Copy className="size-3.5" />
                  {copied ? t("otlCopied") : t("otlCopy")}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="font-medium">{t("otlActive")}</p>
            {activeLinks.length === 0 ? (
              <p className="text-xs text-muted">{t("otlNoActive")}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {activeLinks.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="text-xs">
                      {l.target ?? t("otlAccountAny")} · {t("otlExpiresAt", { at: fmt(l.expiresAt) })}
                    </span>
                    <button
                      type="button"
                      disabled={revoking}
                      onClick={() => startRevoke(() => revokeOneTimeLoginLinkAction(l.id))}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-error"
                    >
                      <XCircle className="size-3.5" />
                      {t("otlRevoke")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
