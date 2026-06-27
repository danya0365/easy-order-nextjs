import Link from "next/link";
import { Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { BillingStatus } from "@/src/domain/services/subscription-status";

/**
 * Proactive "expiring soon" nudge shown in the days BEFORE expiry (within the
 * warn window). Renders nothing otherwise. Encourages topping up early so the
 * shop never lapses. The post-expiry case is handled by SuspensionBanner.
 */
export async function PreExpiryBanner({ status }: { status: BillingStatus }) {
  if (status.preExpiryBannerLevel <= 0 || status.state !== "active") return null;

  const t = await getTranslations("billing");
  const urgent = status.daysUntilDue <= 2;
  const tone = urgent
    ? "bg-amber-50 text-amber-800 ring-amber-200"
    : "bg-brand-50 text-brand-800 ring-brand-100";

  return (
    <div className={`px-4 py-3 ring-1 print:hidden ${tone}`}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-4 shrink-0" />
          <span>
            {t.rich("preExpiryWarning", {
              days: status.daysUntilDue,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </span>
        </span>
        <Link
          href="/shop/billing"
          className="rounded-full bg-brand-500 px-3 py-1 font-medium text-on-brand hover:bg-brand-600"
        >
          {t("topup")}
        </Link>
      </div>
    </div>
  );
}
