import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { PlatformSettingsForm } from "@/src/presentation/components/admin/PlatformSettingsForm";
import { PlatformFeatureSwitchesForm } from "@/src/presentation/components/admin/PlatformFeatureSwitchesForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireRole("platform_admin");
  const t = await getTranslations("adminPages");
  const tc = await getTranslations("adminConfig");
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
          shopSuspensionEnabled={settings.shopSuspensionEnabled}
          dailyFeeBillingEnabled={settings.dailyFeeBillingEnabled}
          dailyOrderThreshold={settings.dailyOrderThreshold}
          dailyFeeSatang={settings.dailyFeeSatang}
          defaultCutoffTime={settings.defaultCutoffTime}
        />
      </Card>
      <Card>
        <CardHeader title={tc("featuresTitle")} subtitle={tc("featuresSubtitle")} />
        <PlatformFeatureSwitchesForm
          menuOptionsEnabled={settings.menuOptionsEnabled}
          itemDetailEnabled={settings.itemDetailEnabled}
        />
      </Card>
    </div>
  );
}
