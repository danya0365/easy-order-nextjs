import { Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { ContactAdminForm } from "@/src/presentation/components/shop/ContactAdminForm";
import { formatDateTime } from "@/src/presentation/lib/format-date";

export const dynamic = "force-dynamic";

export default async function ShopContactPage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("shopPages");
  const requests = await container.contactRequestRepository.listByShop(
    shopId,
    10,
  );
  const open = requests.find((r) => r.status === "open");
  const past = requests.filter((r) => r.status === "resolved");

  return (
    <div className="flex flex-col gap-4">
      {open ? (
        <Card>
          <CardHeader
            title={t("requestPendingTitle")}
            action={
              <Badge tone="warning">
                <Clock className="size-3.5" />
                {t("pending")}
              </Badge>
            }
          />
          <p className="font-medium text-foreground">{open.subject}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
            {open.message}
          </p>
          <p className="mt-2 text-xs text-muted">
            {t("sentAt", { date: formatDateTime(open.createdAt) })}
          </p>
          <p className="mt-3 rounded-lg bg-muted-surface px-3 py-2 text-xs text-muted">
            {t("requestPendingHint")}
          </p>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title={t("contactAdminTitle")}
            subtitle={t("contactPageSubtitle")}
          />
          <ContactAdminForm />
        </Card>
      )}

      {past.length > 0 && (
        <Card>
          <CardHeader title={t("requestHistoryTitle")} />
          <ul className="flex flex-col divide-y divide-border">
            {past.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {r.subject}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDateTime(r.createdAt)}
                  </p>
                </div>
                <Badge tone="success">{t("resolved")}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
