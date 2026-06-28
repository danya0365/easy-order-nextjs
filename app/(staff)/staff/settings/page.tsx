import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  requireRole,
  getCurrentSessionToken,
} from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { ConnectionsSection } from "@/src/presentation/components/channels/ConnectionsSection";
import { ChangePasswordForm } from "@/src/presentation/components/auth/ChangePasswordForm";
import { TwoFactorPanel } from "@/src/presentation/components/auth/TwoFactorPanel";
import { DeviceList } from "@/src/presentation/components/auth/DeviceList";
import { signOutEverywhereAction } from "@/src/presentation/actions/auth-actions";

export const dynamic = "force-dynamic";

export default async function StaffSettingsPage() {
  const user = await requireRole("branch_staff");
  const t = await getTranslations("staffPages");

  const [totpState, sessions, currentToken] = await Promise.all([
    container.userRepository.getTotpState(user.id),
    container.sessionRepository.listByUser(user.id, new Date()),
    getCurrentSessionToken(),
  ]);
  const devices = sessions.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ip: s.ip,
    createdAt: s.createdAt,
    isCurrent: s.id === currentToken,
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-foreground">{t("settingsTitle")}</h1>

      <div className="grid items-start gap-4 lg:grid-cols-2">
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
      </div>
    </div>
  );
}
