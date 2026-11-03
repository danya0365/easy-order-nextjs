import { notFound } from "next/navigation";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { requestMemo } from "@/src/infrastructure/request/request-memo";

/** 404 when the shop has no settlement for that date (layouts run before streaming). */
export default async function AdminCreditDailyDayLayout({ children, params }: { children: React.ReactNode; params: Promise<{ shopId: string; date: string }> }) {
  const { shopId, date } = await params;
  const ok = await requestMemo(`credit:daily:${shopId}:${date}`, async () => {
    await requireRole("platform_admin");
    return !!(await container.creditRepository.findSettlement(shopId, date));
  });
  if (!ok) notFound();
  return children;
}
