"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  loadMoreLeadsAction,
  type LeadRow,
} from "@/src/presentation/actions/lead-actions";
import type { LeadStatus } from "@/src/domain/entities";
import { LoadMore } from "@/src/presentation/components/ui/LoadMore";
import { Badge } from "@/src/presentation/components/ui/Badge";
import {
  LEAD_STATUS_KEY,
  LEAD_STATUS_TONE,
} from "@/src/presentation/lib/lead-display";

/** "YYYY-MM-DD" from an ISO timestamp, for compact display. */
function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

function LeadItem({ row }: { row: LeadRow }) {
  const t = useTranslations("leads");
  const { lead, categoryName } = row;
  const overdueFollowUp =
    lead.nextFollowUpAt !== null &&
    lead.status !== "won" &&
    lead.status !== "lost" &&
    lead.nextFollowUpAt <= new Date().toISOString();

  return (
    <li>
      <Link
        href={`/admin/leads/${lead.id}`}
        className="flex items-center justify-between gap-2 py-3 hover:opacity-80"
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {lead.name}
            {categoryName && (
              <span className="ml-2 text-xs font-normal text-muted">
                · {categoryName}
              </span>
            )}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            {lead.phone && <span>{lead.phone}</span>}
            {lead.nextFollowUpAt && (
              <span className={overdueFollowUp ? "text-error" : undefined}>
                {t("followUpDate", { date: dayOf(lead.nextFollowUpAt) })}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge tone={LEAD_STATUS_TONE[lead.status]}>
            {t(LEAD_STATUS_KEY[lead.status])}
          </Badge>
          <ChevronRight className="size-4 text-muted" />
        </div>
      </Link>
    </li>
  );
}

export function LeadList({
  initialItems,
  initialCursor,
  status,
}: {
  initialItems: LeadRow[];
  initialCursor: string | null;
  status: LeadStatus | null;
}) {
  return (
    <LoadMore<LeadRow>
      initialItems={initialItems}
      initialCursor={initialCursor}
      loadMore={(cursor) => loadMoreLeadsAction(cursor, status)}
      getKey={(row) => row.lead.id}
      renderItem={(row) => <LeadItem row={row} />}
    />
  );
}
