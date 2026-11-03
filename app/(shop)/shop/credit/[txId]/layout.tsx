import { notFound } from "next/navigation";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { requestMemo } from "@/src/infrastructure/request/request-memo";

/** Existence + ownership check in the layout → a real 404 (layouts run before streaming). */
export default async function CreditEntryLayout({ children, params }: { children: React.ReactNode; params: Promise<{ txId: string }> }) {
  const { txId } = await params;
  const ok = await requestMemo(`credit:entry-owned:${txId}`, async () => {
    const { shopId } = await requireShopAccess();
    const e = await container.creditRepository.findEntry(txId);
    return !!e && e.shopId === shopId;
  });
  if (!ok) notFound();
  return children;
}
