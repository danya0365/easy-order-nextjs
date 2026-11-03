import { notFound } from "next/navigation";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { requestMemo } from "@/src/infrastructure/request/request-memo";

export default async function TopupLayout({ children, params }: { children: React.ReactNode; params: Promise<{ topupId: string }> }) {
  const { topupId } = await params;
  const exists = await requestMemo(`credit:topup:${topupId}`, async () => {
    await requireRole("platform_admin");
    return !!(await container.creditRepository.findTopup(topupId));
  });
  if (!exists) notFound();
  return children;
}
