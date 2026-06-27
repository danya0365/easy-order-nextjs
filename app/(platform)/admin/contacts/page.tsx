import { MessageSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import {
  ContactInbox,
  type ContactRow,
} from "@/src/presentation/components/admin/ContactInbox";

export const dynamic = "force-dynamic";

export default async function AdminContactsPage() {
  await requireRole("platform_admin");
  const t = await getTranslations("adminPages");
  const [open, resolvedPage, shops] = await Promise.all([
    container.contactRequestRepository.listOpen(),
    container.contactRequestRepository.pageResolved(),
    container.shopRepository.list(),
  ]);
  const shopName = new Map(shops.map((s) => [s.id, s.name]));
  // Open requests (all) first, then the first page of resolved ones.
  const rows: ContactRow[] = [...open, ...resolvedPage.items].map((r) => ({
    request: r,
    shopName: (r.shopId ? shopName.get(r.shopId) : null) ?? "-",
  }));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title={t("contactsTitle")} />
        {rows.length === 0 ? (
          <EmptyState icon={<MessageSquare />} title={t("noContacts")} />
        ) : (
          <ContactInbox
            initialItems={rows}
            initialCursor={resolvedPage.nextCursor}
          />
        )}
      </Card>
    </div>
  );
}
