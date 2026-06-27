import { ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { AuditTimeline } from "@/src/presentation/components/admin/AuditTimeline";
import { PeerAdminList } from "@/src/presentation/components/admin/PeerAdminList";

export const dynamic = "force-dynamic";

/** Platform Trust & Safety hub — admin accounts + the security/support audit trail. */
export default async function AdminSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const me = await requireRole("platform_admin");
  const t = await getTranslations("adminPages");
  const { action } = await searchParams;
  const filter = action?.trim() ?? "";
  const [page, adminUsers] = await Promise.all([
    container.auditLogRepository.page(filter ? { action: filter } : {}),
    container.userRepository.listByRole("platform_admin"),
  ]);
  const admins = adminUsers.map((u) => ({
    id: u.id,
    email: u.email,
    totpEnabled: u.totpEnabled,
  }));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title={t("adminsTitle")}
          subtitle={t("adminsSubtitle")}
        />
        <PeerAdminList admins={admins} currentAdminId={me.id} />
      </Card>

      <Card>
        <CardHeader
          title={t("auditTitle")}
          subtitle={t("auditSubtitle")}
        />
        {page.items.length === 0 ? (
          <EmptyState icon={<ShieldAlert />} title={t("noEvents")} />
        ) : (
          <AuditTimeline
            initialItems={page.items}
            initialCursor={page.nextCursor}
            action={filter}
          />
        )}
      </Card>
    </div>
  );
}
