import { notFound } from "next/navigation";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { CreditEntryDetail } from "@/src/presentation/components/credit/CreditEntryDetail";

export const dynamic = "force-dynamic";

export default async function AdminCreditTxPage({ params }: { params: Promise<{ txId: string }> }) {
  await requireRole("platform_admin");
  const { txId } = await params;
  const e = await container.creditRepository.findEntry(txId);
  if (!e) notFound();
  const actor = e.actorUserId ? await container.userRepository.findById(e.actorUserId) : null;
  return (
    <CreditEntryDetail
      entry={e}
      backHref={`/admin/credit/shops/${e.shopId}`}
      topupHref={e.topupId ? `/admin/credit/topups/${e.topupId}` : null}
      actorLabel={actor?.email ?? null}
    />
  );
}
