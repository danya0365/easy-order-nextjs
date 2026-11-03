import { notFound } from "next/navigation";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { requestMemo } from "@/src/infrastructure/request/request-memo";

export default async function AdminCreditTxLayout({ children, params }: { children: React.ReactNode; params: Promise<{ txId: string }> }) {
  const { txId } = await params;
  const exists = await requestMemo(`credit:tx:${txId}`, async () => {
    await requireRole("platform_admin");
    return !!(await container.creditRepository.findEntry(txId));
  });
  if (!exists) notFound();
  return children;
}
