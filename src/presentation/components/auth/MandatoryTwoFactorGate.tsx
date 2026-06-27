import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { TwoFactorPanel } from "@/src/presentation/components/auth/TwoFactorPanel";

/**
 * Mandatory-2FA gate rendered IN PLACE OF the admin content (not a redirect) when
 * a platform admin hasn't enrolled yet. Rendering instead of redirecting avoids
 * the App Router soft-navigation blank-screen bug that a layout-level redirect to
 * a same-layout route caused. After enrollment the panel does a full reload to
 * `/admin`, so the layout re-renders with `totpEnabled` true and shows content.
 */
export function MandatoryTwoFactorGate() {
  const t = useTranslations("auth");
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div className="flex items-start gap-2 rounded-lg border border-warning bg-warning-surface px-4 py-3 text-sm text-warning">
        <ShieldAlert className="mt-0.5 size-5 shrink-0" />
        <p>{t("mandatoryHint")}</p>
      </div>
      <Card>
        <CardHeader
          title={t("setup2faTitle")}
          subtitle={t("setup2faSubtitle")}
        />
        <TwoFactorPanel enabled={false} redirectTo="/admin" />
      </Card>
    </div>
  );
}
