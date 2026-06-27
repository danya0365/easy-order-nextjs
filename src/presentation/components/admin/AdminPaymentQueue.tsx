"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Payment } from "@/src/domain/entities";
import { LoadMore } from "@/src/presentation/components/ui/LoadMore";
import { PaymentReview } from "@/src/presentation/components/admin/PaymentReview";
import { satangToBaht } from "@/src/presentation/lib/money";
import { formatDateTime } from "@/src/presentation/lib/format-date";
import { loadMorePendingPaymentsAction } from "@/src/presentation/actions/admin-actions";

export interface PendingPaymentRow {
  payment: Payment;
  shopName: string;
}

function Row({ payment: p, shopName }: PendingPaymentRow) {
  const t = useTranslations("admin");
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <p className="font-medium text-foreground">{shopName}</p>
        <p className="text-sm text-muted">
          ฿{satangToBaht(p.amountSatang)} · {formatDateTime(p.createdAt)}
        </p>
        <p className="text-xs text-brand-700">
          {t("pqTopupDays", { days: p.daysToAdd })}
          {p.bonusDays > 0 ? t("pqBonus", { days: p.bonusDays }) : ""}
          {p.coversPeriodDueAt && (
            <>
              {" "}
              <ArrowRight className="inline size-3 align-text-bottom" />{" "}
              {t("pqValidUntil", { date: formatDateTime(p.coversPeriodDueAt) })}
            </>
          )}
        </p>
        <Link
          href={`/api/slips/${p.id}`}
          target="_blank"
          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
        >
          {t("pqViewSlip")}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <PaymentReview paymentId={p.id} />
    </li>
  );
}

/** Cursor-paginated queue of pending payments awaiting admin review. */
export function AdminPaymentQueue({
  initialItems,
  initialCursor,
}: {
  initialItems: PendingPaymentRow[];
  initialCursor: string | null;
}) {
  return (
    <LoadMore
      initialItems={initialItems}
      initialCursor={initialCursor}
      loadMore={loadMorePendingPaymentsAction}
      getKey={(r) => r.payment.id}
      renderItem={(r) => <Row payment={r.payment} shopName={r.shopName} />}
    />
  );
}
