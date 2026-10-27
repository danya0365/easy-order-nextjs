import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { PlatformSettingsForm } from "@/src/presentation/components/admin/PlatformSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireRole("platform_admin");
  const t = await getTranslations("adminPages");
  const settings = await container.platformSettingsRepository.get();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title={t("settingsTitle")}
          subtitle={t("settingsSubtitle")}
        />
        <PlatformSettingsForm
          billingUiEnabled={settings.billingUiEnabled}
          orderThresholdBillingEnabled={settings.orderThresholdBillingEnabled}
          orderThresholdCount={settings.orderThresholdCount}
          shopSuspensionEnabled={settings.shopSuspensionEnabled}
        />
      </Card>
    </div>
  );
}
