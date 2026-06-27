import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { NotificationList } from "@/src/presentation/components/notification/NotificationList";
import { NotificationInbox } from "@/src/presentation/components/notification/NotificationInbox";
import { MarkAllReadOnView } from "@/src/presentation/components/notification/MarkAllReadOnView";

export const dynamic = "force-dynamic";

export default async function ShopNotificationsPage() {
  const { user } = await requireShopAccess();
  const t = await getTranslations("shopPages");
  const page = await container.notificationRepository.pageByUser(user.id);

  return (
    <div className="flex flex-col gap-4">
      <MarkAllReadOnView />
      <Card>
        <CardHeader title={t("notificationsTitle")} />
        {page.items.length === 0 ? (
          <NotificationList items={[]} />
        ) : (
          <NotificationInbox
            initialItems={page.items}
            initialCursor={page.nextCursor}
          />
        )}
      </Card>
    </div>
  );
}
