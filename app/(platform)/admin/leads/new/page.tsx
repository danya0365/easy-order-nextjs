import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Button } from "@/src/presentation/components/ui/Button";
import { LeadCreateMapPicker } from "@/src/presentation/components/leads/LeadCreateMapPicker";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  await requireRole("platform_admin");
  const tp = await getTranslations("adminPages");
  const categories = await container.shopCategoryRepository.listActive();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground">{tp("leadsNewTitle")}</h1>
        <Link href="/admin/leads">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} />
            {tp("leadsListBack")}
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader
          title={tp("leadsNewPickTitle")}
          subtitle={tp("leadsNewPickSubtitle")}
        />
        <LeadCreateMapPicker
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
          }))}
        />
      </Card>
    </div>
  );
}
