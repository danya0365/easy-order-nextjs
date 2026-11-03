import Link from "next/link";
import { History, ShoppingBag, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ShopOwnerShortcut } from "@/src/presentation/components/layout/ShopOwnerShortcut";
import { HEADER_ICON_BTN, SiteHeader } from "@/src/presentation/components/layout/SiteHeader";

/**
 * Per-shop customer PWA header (shared SiteHeader): shop logo + name on the
 * left; order (cart) + my orders + skin switcher on the right. Intentionally
 * omits Easy Order platform branding. Sits above the page hero (cover +
 * round avatar), which is untouched.
 */
export async function ShopShellHeader({
  slug,
  shopName,
  profileImageId,
}: {
  slug: string;
  shopName: string;
  profileImageId: string | null;
}) {
  const t = await getTranslations("layout");
  return (
    <SiteHeader
      sticky
      width="max-w-md sm:max-w-4xl"
      left={
        <Link
          href={`/s/${slug}`}
          className="flex min-w-0 items-center gap-2.5 text-foreground transition hover:opacity-90"
        >
          {profileImageId ? (
            // eslint-disable-next-line @next/next/no-img-element -- internal image route
            <img
              src={`/api/shop-images/${profileImageId}`}
              alt=""
              className="size-8 shrink-0 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <Store className="size-4" />
            </span>
          )}
          <span className="truncate text-sm font-bold">{shopName}</span>
        </Link>
      }
      actions={
        <>
          <ShopOwnerShortcut slug={slug} label={t("navManageShop")} className={HEADER_ICON_BTN} />
          <Link href={`/s/${slug}/order`} aria-label={t("navShopOrder")} title={t("navShopOrder")} className={HEADER_ICON_BTN} data-testid="header-cart">
            <ShoppingBag className="size-5" />
          </Link>
          <Link href={`/s/${slug}/orders`} aria-label={t("navShopOrders")} title={t("navShopOrders")} className={HEADER_ICON_BTN} data-testid="header-my-orders">
            <History className="size-5" />
          </Link>
        </>
      }
    />
  );
}
