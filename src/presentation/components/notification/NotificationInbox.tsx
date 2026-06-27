"use client";

import type { Notification } from "@/src/domain/entities";
import { LoadMore } from "@/src/presentation/components/ui/LoadMore";
import { loadMoreNotificationsAction } from "@/src/presentation/actions/notification-actions";
import { NotificationRow } from "./NotificationList";

/** Cursor-paginated notification inbox (shop + admin share this). */
export function NotificationInbox({
  initialItems,
  initialCursor,
}: {
  initialItems: Notification[];
  initialCursor: string | null;
}) {
  return (
    <LoadMore
      initialItems={initialItems}
      initialCursor={initialCursor}
      loadMore={loadMoreNotificationsAction}
      getKey={(n) => n.id}
      renderItem={(n) => (
        <li>
          <NotificationRow n={n} />
        </li>
      )}
    />
  );
}
