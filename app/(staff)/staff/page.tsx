import { ClipboardList } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card } from "@/src/presentation/components/ui/Card";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function StaffHomePage() {
  const user = await requireRole("branch_staff");
  const t = await getTranslations("staffPages");
  const branch = user.branchId
    ? await container.branchRepository.findById(user.branchId)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("ordersTitle")}</h1>
        <p className="mt-1 text-sm text-muted">
          {branch ? t("branchLabel", { name: branch.name }) : t("branchStaffFallback")}
        </p>
      </div>
      <Card>
        <EmptyState
          icon={<ClipboardList />}
          title={t("orderQueueComingSoon")}
          description={t("orderQueueComingSoonDesc")}
        />
      </Card>
    </div>
  );
}
