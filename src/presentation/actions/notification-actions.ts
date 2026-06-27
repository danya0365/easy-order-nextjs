"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { requireRole } from "@/src/infrastructure/auth/session";
import type { Notification } from "@/src/domain/entities";
import type { Page } from "@/src/application/repositories/pagination";

/** Next page of the current operator's notifications (inbox "load more"). */
export async function loadMoreNotificationsAction(
  cursor: string,
): Promise<Page<Notification>> {
  const user = await requireRole("shop_owner", "platform_admin", "branch_staff");
  return container.notificationRepository.pageByUser(user.id, { cursor });
}

/** Mark every notification for the current operator as read. */
export async function markAllReadAction(): Promise<void> {
  const user = await requireRole(
    "shop_owner",
    "platform_admin",
    "branch_staff",
  );
  await container.notificationRepository.markAllRead(user.id);
  revalidatePath("/shop/notifications");
  revalidatePath("/admin/notifications");
}
