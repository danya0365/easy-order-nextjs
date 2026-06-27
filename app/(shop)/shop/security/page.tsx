import { ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { AuditTimeline } from "@/src/presentation/components/admin/AuditTimeline";

export const dynamic = "force-dynamic";

/** Owner-facing activity/security log — scoped to this shop only. */
export default async function ShopSecurityPage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("shopPages");
  const page = await container.auditLogRepository.pageByShop(shopId);

  return (
    <div className="flex flex-col gap-4">
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
