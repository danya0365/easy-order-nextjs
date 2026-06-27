"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/src/presentation/components/ui/Badge";
import { useConfirm } from "@/src/presentation/components/ui/ConfirmDialog";
import { useToast } from "@/src/presentation/components/ui/Toast";
import { resetPeerTwoFactorAction } from "@/src/presentation/actions/admin-actions";

export interface AdminRow {
  id: string;
  email: string;
  totpEnabled: boolean;
}

/** Lists platform admins with their 2FA status + a break-glass "reset 2FA" for peers. */
export function PeerAdminList({
  admins,
  currentAdminId,
}: {
  admins: AdminRow[];
  currentAdminId: string;
}) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resetIds, setResetIds] = useState<Set<string>>(new Set());
  const confirm = useConfirm();
  const toast = useToast();

  async function reset(a: AdminRow) {
    const ok = await confirm({
      title: t("palResetConfirmTitle"),
      message: t("palResetConfirmMessage", { email: a.email }),
      confirmLabel: t("palResetConfirmLabel"),
      tone: "danger",
    });
    if (!ok) return;
    setError(null);
    start(async () => {
      const res = await resetPeerTwoFactorAction(a.id);
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        setResetIds((prev) => new Set(prev).add(a.id));
        toast.success(t("palResetSuccess"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y divide-border">
        {admins.map((a) => {
          const isSelf = a.id === currentAdminId;
          const wasReset = resetIds.has(a.id);
          const enabled = a.totpEnabled && !wasReset;
          return (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">
                  {a.email}
                  {isSelf && <span className="ml-1 text-xs text-muted">{t("palYou")}</span>}
                </span>
                {enabled ? (
                  <span className="flex items-center gap-1 text-xs text-success">
                    <ShieldCheck className="size-3.5" /> {t("pal2faOn")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <ShieldOff className="size-3.5" /> {t("pal2faOff")}
                  </span>
                )}
              </span>
              {!isSelf && enabled && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => reset(a)}
                  className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs text-muted hover:text-error disabled:opacity-60"
                >
                  {t("palReset2fa")}
                </button>
              )}
              {wasReset && <Badge tone="warning">{t("palWasReset")}</Badge>}
            </li>
          );
        })}
      </ul>
      {error && <p className="text-sm text-error">{error}</p>}
      <p className="text-xs text-muted">
        {t.rich("palSelfHint", {
          email: "<email>",
          code: (chunks) => <code>{chunks}</code>,
        })}
      </p>
    </div>
  );
}
