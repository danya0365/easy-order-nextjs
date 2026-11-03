import Link from "next/link";
import {
  BookOpenCheck,
  ClipboardList,
  ExternalLink,
  FileText,
  Megaphone,
  Printer,
  QrCode,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card } from "@/src/presentation/components/ui/Card";
import { OrderQrExpiryBadge } from "@/src/presentation/components/shop/OrderQrExpiryBadge";

export const dynamic = "force-dynamic";

const BIG_BTN =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-base font-semibold text-on-brand transition hover:bg-brand-600 sm:w-auto";
const SOFT_BTN =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-card px-5 py-3 text-base font-semibold text-brand-700 ring-1 ring-border transition hover:bg-brand-50 sm:w-auto";

/**
 * QR hub — one place for every printable QR (order QR, menu QR, one-sheet
 * menu, join QR, poster). The individual tools still live where they were
 * (settings / menu / members / promote); this page only links + adds the
 * dedicated print pages under /shop/qr/*.
 */
export default async function ShopQrHubPage() {
  const { shopId } = await requireShopAccess();
  const [t, shop] = await Promise.all([
    getTranslations("qrHub"),
    container.shopRepository.findById(shopId),
  ]);
  if (!shop) return null;

  const items: {
    id: string;
    icon: LucideIcon;
    title: string;
    desc: string;
    href: string;
    cta: string;
    external?: boolean;
    primary?: boolean;
  }[] = [
    { id: "menu", icon: QrCode, title: t("menuTitle"), desc: t("menuDesc"), href: "/shop/qr/menu", cta: t("menuCta"), primary: true },
    { id: "sheet", icon: FileText, title: t("sheetTitle"), desc: t("sheetDesc"), href: `/s/${shop.slug}/menu/print`, cta: t("sheetCta"), external: true, primary: true },
    { id: "join", icon: UserPlus, title: t("joinTitle"), desc: t("joinDesc"), href: "/shop/settings/members", cta: t("joinCta") },
    { id: "poster", icon: Megaphone, title: t("posterTitle"), desc: t("posterDesc"), href: "/shop/promote", cta: t("posterCta") },
  ];

  return (
    <div className="flex flex-col gap-4" data-testid="qr-hub">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <QrCode className="size-6 text-brand-600" /> {t("title")}
        </h1>
        <p className="mt-0.5 text-sm text-muted">{t("subtitle")}</p>
      </div>

      <Card className="flex flex-col gap-3 ring-2 ring-brand-500/40" data-testid="qr-hub-order">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <ClipboardList className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-foreground">{t("orderTitle")}</p>
            <p className="text-sm text-muted">{t("orderDesc")}</p>
          </div>
        </div>
        {shop.onlineOrderingEnabled ? (
          <>
            <OrderQrExpiryBadge shopId={shop.id} className="self-start" />
            <Link href="/shop/qr/order" className={BIG_BTN} data-testid="qr-hub-order-print">
              <Printer className="size-5" /> {t("orderCta")}
            </Link>
          </>
        ) : (
          <Link href="/shop/settings" className={SOFT_BTN}>
            {t("orderOff")}
          </Link>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(({ id, icon: Icon, title, desc, href, cta, external, primary }) => (
          <Card key={id} className="flex flex-col gap-3" data-testid={`qr-hub-${id}`}>
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-foreground">{title}</p>
                <p className="text-sm text-muted">{desc}</p>
              </div>
            </div>
            <Link
              href={href}
              target={external ? "_blank" : undefined}
              className={`${primary ? BIG_BTN : SOFT_BTN} mt-auto`}
            >
              {primary ? <Printer className="size-5" /> : null} {cta}
              {external ? <ExternalLink className="size-4" /> : null}
            </Link>
          </Card>
        ))}
      </div>

      <Link href="/shop/guides/print-qr" className="inline-flex items-center gap-2 self-start text-sm font-semibold text-brand-700 hover:underline">
        <BookOpenCheck className="size-4" /> {t("guideLink")}
      </Link>
    </div>
  );
}
