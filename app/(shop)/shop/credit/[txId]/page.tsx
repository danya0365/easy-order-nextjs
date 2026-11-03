import { notFound } from "next/navigation";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { CreditEntryDetail } from "@/src/presentation/components/credit/CreditEntryDetail";

export const dynamic = "force-dynamic";

export default async function ShopCreditEntryPage({ params }: { params: Promise<{ txId: string }> }) {
  const { txId } = await params;
  const { shopId } = await requireShopAccess();
  const entry = await container.creditRepository.findEntry(txId);
  if (!entry || entry.shopId !== shopId) notFound();
  return <CreditEntryDetail entry={entry} backHref="/shop/credit" orderHref={entry.orderId ? `/shop/orders/${entry.orderId}` : null} showActor={false} />;
}
