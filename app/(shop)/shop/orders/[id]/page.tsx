import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { Card } from "@/src/presentation/components/ui/Card";
import { satangToBaht } from "@/src/presentation/lib/money";
import { formatDateTime } from "@/src/presentation/lib/format-date";

export const dynamic = "force-dynamic";

/** Read-only order detail (linked from the customer CRM order history). */
export default async function ShopOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { shopId } = await requireShopAccess();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) notFound();
  const order = await container.orderRepository.findById(shopId, id);
  if (!order) notFound();
  const t = await getTranslations("customerDetail");

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={order.customerId ? `/shop/customers/${order.customerId}` : "/shop/orders"}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("back")}
      </Link>
      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">#{order.orderNo}</h1>
            <p className="text-xs text-muted">{formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge tone={order.status === "cancelled" ? "danger" : order.status === "completed" ? "success" : "warning"}>
              {t(`ostatus_${order.status}` as "ostatus_pending")}
            </Badge>
            <Badge>{t(order.fulfillmentType === "dine_in" ? "dineIn" : (order.fulfillmentType as "pickup"))}</Badge>
          </div>
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between gap-2">
              <span className="min-w-0 break-words">{it.nameSnapshot} ×{it.quantity}</span>
              <span className="shrink-0 text-muted">{satangToBaht(it.lineTotalSatang)}</span>
            </li>
          ))}
        </ul>
        <p className="flex justify-between border-t border-border pt-2 font-semibold">
          <span>{t("total")}</span>
          <span>{satangToBaht(order.totalSatang)}</span>
        </p>
        {order.note && <p className="text-sm">{order.note}</p>}
        {order.deliveryAddress && <p className="text-sm text-muted break-words">{order.deliveryAddress}</p>}
      </Card>
    </div>
  );
}
