import "server-only";

import { container } from "@/src/infrastructure/di/container";
import { requestMemo } from "@/src/infrastructure/request/request-memo";
import type { CreditStatus } from "@/src/application/services/CreditService";

/** Per-request memoised credit status (layout badge + dashboard + credit page share it). */
export function shopCreditStatus(shopId: string): Promise<CreditStatus> {
  return requestMemo(`credit:status:${shopId}`, () => container.creditService.getStatus(shopId));
}
