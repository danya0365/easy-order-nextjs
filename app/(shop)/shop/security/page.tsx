import { LogOut, ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  requireShopAccess,
  getCurrentSessionToken,
} from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { AuditTimeline } from "@/src/presentation/components/admin/AuditTimeline";
import { ChangePasswordForm } from "@/src/presentation/components/auth/ChangePasswordForm";
import { TwoFactorPanel } from "@/src/presentation/components/auth/TwoFactorPanel";
import { DeviceList } from "@/src/presentation/components/auth/DeviceList";
import { ConnectionsSection } from "@/src/presentation/components/channels/ConnectionsSection";
import { signOutEverywhereAction } from "@/src/presentation/actions/auth-actions";

export const dynamic = "force-dynamic";

/**
 * Owner-facing security page: the shop's own account self-service (password,
 * 2FA, LINE link, active sessions) + the shop-scoped activity/audit log.
 *
 * The account sections act on the *logged-in* user, so they show ONLY for a
 * real `shop_owner` session — an impersonating platform_admin manages their own
 * account from the admin dashboard, never the owner's.
 */
export default async function ShopSecurityPage() {
  const { user, shopId, impersonating } = await requireShopAccess();
  const t = await getTranslations("shopPages");
  const page = await container.auditLogRepository.pageByShop(shopId);

  const showAccount = !impersonating;
  const [totpState, sessions, currentToken] = showAccount
    ? await Promise.all([
        container.userRepository.getTotpState(user.id),
        container.sessionRepository.listByUser(user.id, new Date()),
        getCurrentSessionToken(),
      ])
    : [null, [], null];
  const devices = sessions.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ip: s.ip,
    createdAt: s.createdAt,
    isCurrent: s.id === currentToken,
  }));

  return (
    <div className="flex flex-col gap-4">
      {showAccount && (
        <>
          <Card>
            <CardHeader
              title={t("connectionsTitle")}
              subtitle={t("connectionsSubtitle")}
            />
            <ConnectionsSection
              linked={!!user.lineUserId}
              addUrl={process.env.NEXT_PUBLIC_LINE_OA_ADD_URL}
            />
          </Card>

          <Card>
            <CardHeader
              title={t("twoFactorTitle")}
              subtitle={t("twoFactorSubtitle")}
            />
            <TwoFactorPanel
              enabled={user.totpEnabled}
              recoveryRemaining={totpState?.recoveryCodes.length}
            />
          </Card>

          <Card>
            <CardHeader title={t("changePasswordTitle")} />
            <ChangePasswordForm />
          </Card>

          <Card>
            <CardHeader
              title={t("devicesTitle")}
              subtitle={t("devicesSubtitle")}
            />
            <DeviceList devices={devices} />
            <form
              className="mt-3"
              action={async () => {
                "use server";
                await signOutEverywhereAction();
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted-surface"
              >
                <LogOut className="size-4" />
                {t("signOutOthers")}
              </button>
            </form>
          </Card>
        </>
      )}

      <Card>
        <CardHeader
          title={t("securityTitle")}
          subtitle={t("securitySubtitle")}
        />
        {page.items.length === 0 ? (
          <EmptyState icon={<ShieldAlert />} title={t("noEvents")} />
        ) : (
          <AuditTimeline
            scope="shop"
            initialItems={page.items}
            initialCursor={page.nextCursor}
          />
        )}
      </Card>
    </div>
  );
}
