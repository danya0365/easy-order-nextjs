import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { getBillingState } from "@/src/infrastructure/auth/billing-guard";
import { container } from "@/src/infrastructure/di/container";
import { AppHeader } from "@/src/presentation/components/layout/AppHeader";
import { AppTabBar } from "@/src/presentation/components/layout/AppTabBar";
import { AppVersion } from "@/src/presentation/components/layout/AppVersion";
import { SuspensionBanner } from "@/src/presentation/components/billing/SuspensionBanner";
import { PreExpiryBanner } from "@/src/presentation/components/billing/PreExpiryBanner";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("branch_staff");
  const t = await getTranslations("staffPages");
  const { status } = await getBillingState(user.shopId!);
  const unread = await container.notificationRepository.countUnread(user.id);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        role={t("roleStaff")}
        userEmail={user.email}
        notifications={{ href: "/staff/notifications", unread }}
      />
      <SuspensionBanner status={status} />
      <PreExpiryBanner status={status} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
        {status.isPaused ? (
          <div className="rounded-2xl bg-amber-50 p-6 text-center">
            <p className="text-lg font-semibold text-amber-800">{t("shopPausedTitle")}</p>
            <p className="mt-1 text-sm text-muted">{t("shopPausedBody")}</p>
          </div>
        ) : status.isSuspended ? (
          <div className="rounded-2xl bg-error-surface p-6 text-center">
            <p className="text-lg font-semibold text-error">{t("shopSuspendedTitle")}</p>
            <p className="mt-1 text-sm text-muted">{t("shopSuspendedBody")}</p>
          </div>
        ) : (
          children
        )}
        <AppVersion />
      </main>
      <AppTabBar nav="staff" />
    </div>
  );
}
