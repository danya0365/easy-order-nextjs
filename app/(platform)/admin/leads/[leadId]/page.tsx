import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { Button } from "@/src/presentation/components/ui/Button";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { LeadEditForm } from "@/src/presentation/components/leads/LeadEditForm";
import { LeadStatusControl } from "@/src/presentation/components/leads/LeadStatusControl";
import { LeadLocationEditor } from "@/src/presentation/components/leads/LeadLocationEditor";
import { LeadPhotoUpload } from "@/src/presentation/components/leads/LeadPhotoUpload";
import { AddVisitLogForm } from "@/src/presentation/components/leads/AddVisitLogForm";
import { ConvertLeadButton } from "@/src/presentation/components/leads/ConvertLeadButton";
import {
  LEAD_REACTION_KEY,
  LEAD_STATUS_KEY,
  LEAD_STATUS_TONE,
} from "@/src/presentation/lib/lead-display";

export const dynamic = "force-dynamic";

/** Compact "YYYY-MM-DD HH:mm" in Bangkok time for a log timestamp. */
function fmt(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  await requireRole("platform_admin");
  const t = await getTranslations("leads");
  const tp = await getTranslations("adminPages");
  const { leadId } = await params;

  const lead = await container.leadRepository.findById(leadId);
  if (!lead) notFound();

  const [categories, logs, convertedShop] = await Promise.all([
    container.shopCategoryRepository.listActive(),
    container.leadVisitLogRepository.listByLead(leadId, 50),
    lead.convertedShopId
      ? container.shopRepository.findById(lead.convertedShopId)
      : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Link href="/admin/leads">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} />
            {tp("leadsListBack")}
          </Button>
        </Link>
        <Badge tone={LEAD_STATUS_TONE[lead.status]}>
          {t(LEAD_STATUS_KEY[lead.status])}
        </Badge>
      </div>

      <Card>
        <CardHeader
          title={lead.name}
          subtitle={lead.phone ?? undefined}
        />
        <LeadEditForm
          lead={lead}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </Card>

      <Card>
        <CardHeader title={tp("leadSalesStatus")} />
        <LeadStatusControl lead={lead} />
      </Card>

      <Card>
        <CardHeader
          title={tp("leadLocationTitle")}
          subtitle={tp("leadLocationSubtitle")}
        />
        <LeadLocationEditor
          leadId={lead.id}
          latitude={lead.latitude}
          longitude={lead.longitude}
          address={lead.address}
        />
      </Card>

      <Card>
        <CardHeader title={tp("leadPhotoTitle")} />
        <LeadPhotoUpload leadId={lead.id} hasPhoto={lead.photoUrl !== null} />
      </Card>

      <Card>
        <CardHeader title={tp("leadVisitLogTitle")} />
        <AddVisitLogForm leadId={lead.id} currentStatus={lead.status} />
        <div className="mt-4">
          {logs.length === 0 ? (
            <EmptyState icon={<Phone />} title={tp("leadNoVisitLogs")} />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {logs.map((log) => (
                <li key={log.id} className="flex flex-col gap-0.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {t(LEAD_REACTION_KEY[log.reaction])}
                    </span>
                    <span className="text-xs text-muted">
                      {fmt(log.createdAt)}
                    </span>
                  </div>
                  {log.statusBefore &&
                    log.statusAfter &&
                    log.statusBefore !== log.statusAfter && (
                      <p className="text-xs text-muted">
                        {t(LEAD_STATUS_KEY[log.statusBefore])} →{" "}
                        {t(LEAD_STATUS_KEY[log.statusAfter])}
                      </p>
                    )}
                  {log.note && (
                    <p className="text-sm text-foreground">{log.note}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title={tp("leadConvertTitle")} />
        {/* Always mounted (even after conversion) so the post-create credentials
            handoff survives the action's page refresh. */}
        <ConvertLeadButton
          lead={lead}
          convertedSlug={convertedShop?.slug ?? null}
        />
      </Card>
    </div>
  );
}
