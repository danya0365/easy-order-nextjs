import { requireRole } from "@/src/infrastructure/auth/session";
import { is2faBypassed } from "@/src/infrastructure/config/env";
import { container } from "@/src/infrastructure/di/container";
import { AppHeader } from "@/src/presentation/components/layout/AppHeader";
import { AppTabBar } from "@/src/presentation/components/layout/AppTabBar";
import { AppVersion } from "@/src/presentation/components/layout/AppVersion";
import { MandatoryTwoFactorGate } from "@/src/presentation/components/auth/MandatoryTwoFactorGate";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("platform_admin");

  // 2FA is mandatory for platform admins. Gate by RENDERING the setup card in
  // place of the content (NOT a layout-level redirect, which blanks the screen on
  // App Router soft navigation). Admin can't reach any admin feature until enrolled.
  // DEV bypass lets local testing skip the mandatory-2FA setup gate.
  const twoFactorOk = user.totpEnabled || is2faBypassed;
  const unread = twoFactorOk
    ? await container.notificationRepository.countUnread(user.id)
    : 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        role="Admin"
        userEmail={user.email}
        notifications={{ href: "/admin/notifications", unread }}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
        {twoFactorOk ? children : <MandatoryTwoFactorGate />}
        <AppVersion />
      </main>
      <AppTabBar nav="admin" />
    </div>
  );
}
