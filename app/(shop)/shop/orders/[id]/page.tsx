import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { OrderCard } from "@/src/presentation/components/order/OrderQueue";
import { OrderDetailExtras } from "@/src/presentation/components/order/OrderDetailExtras";
import { satangToBaht } from "@/src/presentation/lib/money";
import { withCustomerNotes } from "@/src/presentation/lib/order-notes";

export const dynamic = "force-dynamic";

/**
 * Shop order detail with the same actions as the queue card (status
 * transitions, cancel-with-reason, mark paid) plus print / copy / call /
 * open-customer. No loading.tsx above this route, so notFound() is a real 404.
 */
export default async function ShopOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { shopId } = await requireShopAccess();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) notFound();
  const found = await container.orderRepository.findById(shopId, id);
  if (!found) notFound();
  const [order] = await withCustomerNotes(shopId, [found]);
  const t = await getTranslations("customerDetail");

  const summary = [
    `#${order.orderNo}`,
    ...order.items.map((it) => `${it.nameSnapshot} x${it.quantity}  ${satangToBaht(it.lineTotalSatang)}`),
    `${t("total")}: ${satangToBaht(order.totalSatang)}`,
    order.customerName || "",
    order.customerPhone || "",
    order.deliveryAddress || "",
    order.note || "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={order.customerId ? `/shop/customers/${order.customerId}` : "/shop/orders"}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground print:hidden"
      >
        <ArrowLeft className="size-4" />
        {t("back")}
      </Link>
      <OrderDetailExtras
        summary={summary}
        phone={order.customerPhone}
        customerHref={order.customerId ? `/shop/customers/${order.customerId}` : null}
      />
      <OrderCard order={order} />
    </div>
  );
}
