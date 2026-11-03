import { Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { CreditStatus } from "@/src/application/services/CreditService";
import { satangToBaht } from "@/src/presentation/lib/money";
import { CreditLevelBadge } from "./CreditBits";

/** Balance card for admin views (no top-up CTA, shown even when credit is off). */
export async function CreditDashCardAdmin({ status }: { status: CreditStatus }) {
  const t = await getTranslations("credit");
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
      <span className="flex size-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
        <Wallet className="size-5" />
      </span>
      <span>
        <span className="flex items-center gap-2 text-xs text-muted">
          {t("balance")} <CreditLevelBadge level={status.gate.level} />
          {!status.enabled && <span>· {t("offNote").split(" — ")[0]}</span>}
        </span>
        <span className="block text-xl font-bold tabular-nums text-foreground" data-testid="admin-credit-balance">฿{satangToBaht(status.balanceSatang)}</span>
      </span>
    </div>
  );
}
