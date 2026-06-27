import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { BillingStatus } from "@/src/domain/services/subscription-status";
import { GRACE_DAYS } from "@/src/domain/services/subscription-status";

/**
 * Escalating expiry banner shown daily after the shop's days run out. Renders
 * nothing until expired. Severity grows with daysOverdue (1..GRACE_DAYS).
 * Suspension itself is handled by the gate, not this banner.
 */
export async function SuspensionBanner({ status }: { status: BillingStatus }) {
  if (status.bannerLevel <= 0 || status.state === "active") return null;

  const t = await getTranslations("billing");
  const urgent = status.daysOverdue >= GRACE_DAYS - 2;
  const tone = urgent
    ? "bg-red-50 text-red-800 ring-red-200"
    : "bg-amber-50 text-amber-800 ring-amber-200";

  return (
    <div className={`px-4 py-3 ring-1 print:hidden ${tone}`}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <TriangleAlert className="size-4 shrink-0" />
          <span>
            {t.rich("suspensionWarning", {
              overdue: status.daysOverdue,
              grace: status.graceDaysLeft,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </span>
        </span>
        <Link
          href="/shop/billing"
          className="rounded-full bg-brand-500 px-3 py-1 font-medium text-on-brand hover:bg-brand-600"
        >
          {t("topupNow")}
        </Link>
      </div>
    </div>
  );
}
