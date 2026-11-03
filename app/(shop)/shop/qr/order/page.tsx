import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { buildOrderAccessQr } from "@/src/infrastructure/request/order-qr";
import { Card } from "@/src/presentation/components/ui/Card";
import { OrderAccessQrCard } from "@/src/presentation/components/shop/OrderAccessQrCard";
import { OrderQrExpiryBadge } from "@/src/presentation/components/shop/OrderQrExpiryBadge";

export const dynamic = "force-dynamic";

/** Dedicated order-QR print page (same card as Settings → Shop). */
export default async function ShopOrderQrPage() {
  const { shopId } = await requireShopAccess();
  const [t, shop] = await Promise.all([
    getTranslations("qrHub"),
    container.shopRepository.findById(shopId),
  ]);
  if (!shop) return null;
  const qr = await buildOrderAccessQr(shop);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/shop/qr" className="inline-flex items-center gap-1 self-start text-sm font-semibold text-brand-700 print:hidden">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("orderTitle")}</h1>
        <p className="mt-0.5 text-sm text-muted">{t("orderPrintHint")}</p>
      </div>
      <Card className="flex flex-col gap-3">
        {qr ? (
          <>
            <OrderQrExpiryBadge shopId={shop.id} className="self-start" />
            <OrderAccessQrCard qrDataUrl={qr.qrDataUrl} shopName={shop.name} shopId={shop.id} expiresAtMs={qr.expiresAtMs} />
          </>
        ) : (
          <Link href="/shop/settings" className="text-sm font-semibold text-brand-700 hover:underline">
            {t("orderOff")}
          </Link>
        )}
      </Card>
    </div>
  );
}
