import { History, KeyRound, ShieldCheck, Store, XCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { revokeOneTimeLoginLinkFormAction } from "@/src/presentation/actions/one-time-login-actions";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { AdminLoginLinkForm } from "@/src/presentation/components/admin/AdminLoginLinkForm";
import type { AdminLoginLink } from "@/src/application/repositories/IAdminLoginLinkRepository";

export const dynamic = "force-dynamic";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) : "—";

export default async function AdminLoginLinksPage() {
  const me = await requireRole("platform_admin");
  const t = await getTranslations("admin");
  const now = new Date().toISOString();
  const [admins, shops, active, history] = await Promise.all([
    container.userRepository.listByRole("platform_admin"),
    container.shopRepository.list(),
    container.adminLoginLinkRepository.listActive(now),
    container.adminLoginLinkRepository.listRecentClosed(30),
  ]);
  const userIds = new Set<string>();
  for (const l of [...active, ...history]) {
    if (l.targetUserId) userIds.add(l.targetUserId);
    if (l.usedByUserId) userIds.add(l.usedByUserId);
  }
  const users = new Map(
    (await Promise.all([...userIds].map((id) => container.userRepository.findById(id))))
      .filter((u) => !!u)
      .map((u) => [u!.id, u!.email]),
  );
  const shopName = new Map(shops.map((s) => [s.id, s.name]));
  const label = (l: AdminLoginLink) =>
    l.kind === "admin"
      ? users.get(l.targetUserId ?? "") ?? "—"
      : `${shopName.get(l.shopId ?? "") ?? "—"}${l.targetUserId ? ` · ${users.get(l.targetUserId) ?? ""}` : ""}`;
  const KindIcon = ({ l }: { l: AdminLoginLink }) =>
    l.kind === "admin" ? (
      <ShieldCheck className="size-4 shrink-0 text-brand-500" />
    ) : (
      <Store className="size-4 shrink-0 text-muted" />
    );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title={t("otlAdminTitle")} subtitle={t("otlAdminSubtitle")} />
        <AdminLoginLinkForm
          admins={admins
            .filter((a) => a.isActive)
            .map((a) => ({ id: a.id, email: a.email, self: a.id === me.id }))}
          selfId={me.id}
          has2fa={me.totpEnabled}
        />
      </Card>

      <Card>
        <CardHeader title={t("otlActive")} />
        {active.length === 0 ? (
          <p className="text-sm text-muted">{t("otlNoActive")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {active.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <KindIcon l={l} />
                  <span>
                    {label(l)}
                    <span className="block text-xs text-muted">
                      {t("otlExpiresAt", { at: fmt(l.expiresAt) })}
                    </span>
                  </span>
                </span>
                <form action={revokeOneTimeLoginLinkFormAction}>
                  <input type="hidden" name="linkId" value={l.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-error"
                  >
                    <XCircle className="size-3.5" />
                    {t("otlRevoke")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title={t("otlHistory")} />
        {history.length === 0 ? (
          <p className="text-sm text-muted">{t("otlNoHistory")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {history.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <KindIcon l={l} />
                  <span>
                    {label(l)}
                    <span className="block text-xs text-muted">
                      {l.usedAt
                        ? t("otlUsedBy", {
                            at: fmt(l.usedAt),
                            user: users.get(l.usedByUserId ?? "") ?? "—",
                          })
                        : t("otlRevokedAt", { at: fmt(l.revokedAt) })}
                    </span>
                  </span>
                </span>
                {l.usedAt ? (
                  <Badge tone="success">{t("otlUsed")}</Badge>
                ) : (
                  <Badge tone="warning">{t("otlRevoked")}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="flex items-center gap-1 text-xs text-muted">
        <History className="size-3.5" />
        <KeyRound className="size-3.5" />
        {t("otlCliNote")}
      </p>
    </div>
  );
}
