"use client";

import { useTranslations } from "next-intl";

import type { Payment, PaymentStatus } from "@/src/domain/entities";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { LoadMore } from "@/src/presentation/components/ui/LoadMore";
import { satangToBaht } from "@/src/presentation/lib/money";
import { formatDate } from "@/src/presentation/lib/format-date";
import { loadMorePaymentsAction } from "@/src/presentation/actions/billing-actions";

const PAYMENT_BADGE: Record<
  PaymentStatus,
  {
    tone: "warning" | "success" | "danger";
    key: "statusPending" | "statusApproved" | "statusRejected";
  }
> = {
  pending: { tone: "warning", key: "statusPending" },
  approved: { tone: "success", key: "statusApproved" },
  rejected: { tone: "danger", key: "statusRejected" },
};

function PaymentRow({ p }: { p: Payment }) {
  const t = useTranslations("billing");
  const badge = PAYMENT_BADGE[p.status];
  const totalDays = p.daysToAdd + p.bonusDays;
  return (
    <li className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <div>
        <p className="text-foreground">
          ฿{satangToBaht(p.amountSatang)} ·{" "}
          <span className="text-muted">
            {t("daysValue", { days: totalDays })}
            {p.bonusDays > 0 ? ` ${t("bonusShort", { bonus: p.bonusDays })}` : ""}
          </span>
        </p>
        <p className="text-xs text-muted">{formatDate(p.createdAt)}</p>
        {p.status === "rejected" && p.rejectReason && (
          <p className="text-xs text-error">{t("rejectReason", { reason: p.rejectReason })}</p>
        )}
      </div>
      <Badge tone={badge.tone}>{t(badge.key)}</Badge>
    </li>
  );
}

/** Cursor-paginated billing/top-up history for a shop. */
export function PaymentHistoryList({
  initialItems,
  initialCursor,
}: {
  initialItems: Payment[];
  initialCursor: string | null;
}) {
  return (
    <LoadMore
      initialItems={initialItems}
      initialCursor={initialCursor}
      loadMore={loadMorePaymentsAction}
      getKey={(p) => p.id}
      renderItem={(p) => <PaymentRow p={p} />}
    />
  );
}
