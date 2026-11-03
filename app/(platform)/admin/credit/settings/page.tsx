import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { CreditConfigForm } from "@/src/presentation/components/credit/CreditConfigForm";

export const dynamic = "force-dynamic";

export default async function AdminCreditSettingsPage() {
  await requireRole("platform_admin");
  const t = await getTranslations("credit");
  const cfg = await container.creditService.getPlatformConfig();
  return (
    <Card>
      <CardHeader title={t("settings")} subtitle={t("cfgMasterDesc")} />
      <CreditConfigForm initial={cfg} />
    </Card>
  );
}
