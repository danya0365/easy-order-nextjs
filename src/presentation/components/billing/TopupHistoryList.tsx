"use client";

import { CalendarPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import type { TopupTransaction } from "@/src/domain/entities";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { LoadMore } from "@/src/presentation/components/ui/LoadMore";
import { satangToBaht } from "@/src/presentation/lib/money";
import { formatDate } from "@/src/presentation/lib/format-date";
import { loadMoreTopupsAction } from "@/src/presentation/actions/billing-actions";

function TopupRow({ t }: { t: TopupTransaction }) {
  const tr = useTranslations("billing");
  const totalDays = t.daysAdded + t.bonusDaysAdded;
  return (
    <li className="flex items-start justify-between gap-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <CalendarPlus className="size-4 shrink-0 text-brand-500" />
          {tr("daysAddedPositive", { days: totalDays })}
          {t.bonusDaysAdded > 0 ? ` ${tr("bonusShort", { bonus: t.bonusDaysAdded })}` : ""}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {formatDate(t.createdAt)}
          {t.amountSatang > 0 ? ` · ฿${satangToBaht(t.amountSatang)}` : ""}
          {t.note ? ` · ${t.note}` : ""}
        </p>
      </div>
      {t.type === "adjustment" && <Badge tone="neutral">{tr("adjustmentByAdmin")}</Badge>}
    </li>
  );
}

/** Cursor-paginated ledger of usage days credited to a shop. */
export function TopupHistoryList({
  initialItems,
  initialCursor,
}: {
  initialItems: TopupTransaction[];
  initialCursor: string | null;
}) {
  return (
    <LoadMore
      initialItems={initialItems}
      initialCursor={initialCursor}
      loadMore={loadMoreTopupsAction}
      getKey={(t) => t.id}
      renderItem={(t) => <TopupRow t={t} />}
    />
  );
}
