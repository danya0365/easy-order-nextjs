import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Button } from "@/src/presentation/components/ui/Button";
import { LeadMap } from "@/src/presentation/components/leads/LeadMap";
import {
  LEAD_STATUS_KEY,
  LEAD_STATUS_ORDER,
  LEAD_STATUS_PIN,
} from "@/src/presentation/lib/lead-display";

export const dynamic = "force-dynamic";

export default async function AdminLeadsMapPage() {
  await requireRole("platform_admin");
  const t = await getTranslations("leads");
  const tp = await getTranslations("adminPages");
  const locations = await container.leadRepository.listMapLocations();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground">{tp("leadsMapTitle")}</h1>
        <Link href="/admin/leads">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} />
            {tp("leadsListBack")}
          </Button>
        </Link>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        {LEAD_STATUS_ORDER.map((s) => (
          <span key={s} className="inline-flex items-center gap-1">
            <span
              className="inline-block size-3 rounded-full"
              style={{ backgroundColor: LEAD_STATUS_PIN[s] }}
            />
            {t(LEAD_STATUS_KEY[s])}
          </span>
        ))}
      </div>

      <div className="h-[70vh] w-full overflow-hidden rounded-2xl border border-border">
        <LeadMap locations={locations} />
      </div>
    </div>
  );
}
