import { notFound } from "next/navigation";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { requestMemo } from "@/src/infrastructure/request/request-memo";

export default async function CreditShopLayout({ children, params }: { children: React.ReactNode; params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const exists = await requestMemo(`credit:shop:${shopId}`, async () => {
    await requireRole("platform_admin");
    return !!(await container.shopRepository.findById(shopId));
  });
  if (!exists) notFound();
  return children;
}
