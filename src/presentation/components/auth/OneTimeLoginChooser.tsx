"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, Store, UserRound } from "lucide-react";

/**
 * Native form POST to /login/one-time/confirm — works before hydration and
 * without JS, is never prefetched, and is the only thing that consumes a link.
 */
export function OneTimeLoginChooser({
  token,
  accounts,
  error,
}: {
  token: string;
  accounts: { id: string; email: string; role: string }[];
  error?: string;
}) {
  const t = useTranslations("auth");
  const [pending, setPending] = useState(false);
  return (
    <form
      method="post"
      action="/login/one-time/confirm"
      onSubmit={() => setPending(true)}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="t" value={token} />
      {accounts.map((a) => (
        <button
          key={a.id}
          type="submit"
          name="userId"
          value={a.id}
          aria-disabled={pending}
          className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition hover:border-brand-500 hover:bg-brand-50 aria-disabled:opacity-60"
        >
          {a.role === "platform_admin" ? (
            <ShieldCheck className="size-5 text-brand-500" />
          ) : a.role === "shop_owner" ? (
            <Store className="size-5 text-brand-500" />
          ) : (
            <UserRound className="size-5 text-muted" />
          )}
          <span className="flex flex-col">
            <span className="font-medium">{a.email}</span>
            <span className="text-xs text-muted">
              {a.role === "platform_admin"
                ? t("oneTimeAdminConfirm")
                : a.role === "shop_owner"
                  ? t("oneTimeRoleOwner")
                  : t("oneTimeRoleStaff")}
            </span>
          </span>
        </button>
      ))}
      {error && <p className="text-sm text-error">{error}</p>}
      <p className="text-xs text-muted">{t("oneTimeSingleUseNote")}</p>
    </form>
  );
}
