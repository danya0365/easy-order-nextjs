import Link from "next/link";
import { MapPinned, Map as MapIcon, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import type { LeadStatus } from "@/src/domain/entities";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Button } from "@/src/presentation/components/ui/Button";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { LeadList } from "@/src/presentation/components/leads/LeadList";
import type { LeadRow } from "@/src/presentation/actions/lead-actions";
import {
  LEAD_STATUS_KEY,
  LEAD_STATUS_ORDER,
} from "@/src/presentation/lib/lead-display";
import { cn } from "@/src/presentation/components/ui/cn";

export const dynamic = "force-dynamic";

function parseStatus(raw: string | undefined): LeadStatus | null {
  return raw && (LEAD_STATUS_ORDER as string[]).includes(raw)
    ? (raw as LeadStatus)
    : null;
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole("platform_admin");
  const t = await getTranslations("leads");
  const tp = await getTranslations("adminPages");
  const { status: statusParam } = await searchParams;
  const status = parseStatus(statusParam);

  const [page, categories] = await Promise.all([
    container.leadRepository.page({ status }),
    container.shopCategoryRepository.listActive(),
  ]);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const rows: LeadRow[] = page.items.map((lead) => ({
    lead,
    categoryName: lead.categoryId
      ? categoryName.get(lead.categoryId) ?? null
      : null,
  }));

  const filters: { value: LeadStatus | null; label: string }[] = [
    { value: null, label: tp("leadsAll") },
    ...LEAD_STATUS_ORDER.map((s) => ({ value: s, label: t(LEAD_STATUS_KEY[s]) })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground">
          {tp("leadsTitle")}
        </h1>
        <div className="flex gap-2">
          <Link href="/admin/leads/map">
            <Button variant="outline" size="sm">
              <MapIcon size={14} />
              {tp("leadsMapButton")}
            </Button>
          </Link>
          <Link href="/admin/leads/new">
            <Button size="sm">
              <Plus size={14} />
              {tp("leadsAddButton")}
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader title={tp("leadsAllTitle")} />
        <div className="mb-3 flex flex-wrap gap-1.5">
          {filters.map((f) => {
            const active = f.value === status;
            return (
              <Link
                key={f.value ?? "all"}
                href={
                  f.value ? `/admin/leads?status=${f.value}` : "/admin/leads"
                }
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
                  active
                    ? "bg-brand-500 text-on-brand"
                    : "bg-muted-surface text-muted hover:text-foreground",
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={<MapPinned />} title={tp("leadsEmptyStatus")} />
        ) : (
          <LeadList
            initialItems={rows}
            initialCursor={page.nextCursor}
            status={status}
          />
        )}
      </Card>
    </div>
  );
}
