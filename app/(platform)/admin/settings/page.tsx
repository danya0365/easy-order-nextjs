import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import Link from "next/link";
import { Wallet } from "lucide-react";
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
        <Link href="/admin/credit/settings" data-testid="settings-credit-link" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 underline">
          <Wallet className="size-4" /> {t("settingsCreditLink")}
        </Link>
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
