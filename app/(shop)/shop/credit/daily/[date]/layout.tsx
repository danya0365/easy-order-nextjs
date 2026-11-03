import { notFound } from "next/navigation";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { requestMemo } from "@/src/infrastructure/request/request-memo";

/** 404 unless this shop has a settlement for that date. */
export default async function ShopCreditDailyDayLayout({ children, params }: { children: React.ReactNode; params: Promise<{ date: string }> }) {
  const { date } = await params;
  const ok = await requestMemo(`credit:daily-own:${date}`, async () => {
    const { shopId } = await requireShopAccess();
    return !!(await container.creditRepository.findSettlement(shopId, date));
  });
  if (!ok) notFound();
  return children;
}
