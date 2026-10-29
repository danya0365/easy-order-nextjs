"use client";

import { useActionState, useState } from "react";
import { Copy, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  createAdminLoginLinkAction,
  type OneTimeLinkState,
} from "@/src/presentation/actions/one-time-login-actions";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

const field = "rounded-lg border border-border bg-surface px-3 py-2";

export function AdminLoginLinkForm({
  admins,
  selfId,
  has2fa,
}: {
  admins: { id: string; email: string; self: boolean }[];
  selfId: string;
  has2fa: boolean;
}) {
  const t = useTranslations("admin");
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState<OneTimeLinkState, FormData>(
    createAdminLoginLinkAction,
    {},
  );

  return (
    <div className="flex flex-col gap-4 text-sm">
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="font-medium">{t("otlAdminAccount")}</span>
          <select name="targetUserId" defaultValue={selfId} className={field}>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.email}
                {a.self ? ` (${t("otlSelf")})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium">{t("otlExpiry")}</span>
          <select name="expiry" defaultValue="15m" className={field}>
            <option value="15m">{t("otlExpiry15m")}</option>
            <option value="1h">{t("otlExpiry1h")}</option>
            <option value="24h">{t("otlExpiry24h")}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium">{t("otlReauthPassword")}</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            className={field}
          />
        </label>
        {has2fa && (
          <label className="flex flex-col gap-1">
            <span className="font-medium">{t("otlReauthCode")}</span>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={field}
            />
          </label>
        )}
        <p className="text-xs text-muted sm:col-span-2">{t("otlReauthHint")}</p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 font-semibold text-on-brand hover:bg-brand-600 disabled:opacity-60 sm:col-span-2"
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
    </div>
  );
}
