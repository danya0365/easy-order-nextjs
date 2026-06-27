"use server";

import { container } from "@/src/infrastructure/di/container";
import { requireRole } from "@/src/infrastructure/auth/session";
import type { AuditLog } from "@/src/domain/entities";
import type { Page } from "@/src/application/repositories/pagination";

/** Next page of the platform audit trail (admin Security page "load more"). */
export async function loadMoreAuditAction(
  action: string,
  cursor: string,
): Promise<Page<AuditLog>> {
  await requireRole("platform_admin");
  return container.auditLogRepository.page(action ? { action } : {}, { cursor });
}
