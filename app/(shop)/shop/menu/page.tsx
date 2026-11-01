import Link from "next/link";
import { BookOpen, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { MenuManager } from "@/src/presentation/components/menu/MenuManager";
import { getBaseUrl } from "@/src/presentation/lib/base-url";
import { CopyLinkButton } from "@/src/presentation/components/public-menu/CopyLinkButton";
import { renderQrDataUrl } from "@/src/infrastructure/services/qr";
import { publicMenuUrl } from "@/src/domain/services/public-menu";
import { MenuQrCardPanel, type MenuQrSeed } from "@/src/presentation/components/public-menu/MenuQrCardPanel";
import { isMenuOptionsEnabledForShop } from "@/src/application/use-cases/menu/MenuOptionUseCases";

export const dynamic = "force-dynamic";

export default async function ShopMenuPage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("shopPages");
  const tMenu = await getTranslations("publicMenu");
  const shop = await container.shopRepository.findById(shopId);
  const menuPath = shop ? `/s/${shop.slug}/menu` : null;
  const baseUrl = await getBaseUrl();
  const menuUrl = shop ? publicMenuUrl(baseUrl, shop.slug) : null;
  let qrSeed: MenuQrSeed | null = null;
  if (shop) {
    // Static, token-free public URLs only (read-only menu; cannot place orders).
    const bookUrl = publicMenuUrl(baseUrl, shop.slug, "book");
    const [normalQr, bookQr, profile] = await Promise.all([
      renderQrDataUrl(menuUrl!),
      renderQrDataUrl(bookUrl),
      container.shopImageRepository.findProfile(shopId),
    ]);
    // Inline the logo as a data URL so PNG export doesn't taint the canvas.
    let logoDataUrl: string | null = null;
    if (profile) {
      const file = await container.slipStorage.read(profile.storageKey);
      if (file) logoDataUrl = `data:${file.contentType};base64,${Buffer.from(file.bytes).toString("base64")}`;
    }
    qrSeed = {
      shopName: shop.name,
      logoDataUrl,
      normal: { url: menuUrl!, qrDataUrl: normalQr },
      book: { url: bookUrl, qrDataUrl: bookQr },
    };
  }
  const [categories, items] = await Promise.all([
    container.menuCategoryRepository.listByShop(shopId),
    container.menuItemRepository.listByShop(shopId),
  ]);
  const optionsOn = await isMenuOptionsEnabledForShop(
    container.platformSettingsRepository,
    container.shopRepository,
    shopId,
  );
  const optionGroups = optionsOn
    ? await container.menuOptionRepository.listByItems(shopId, items.map((i) => i.id))
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("menuTitle")}</h1>
        <p className="mt-0.5 text-sm text-muted">{t("menuSubtitle")}</p>
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          {t("halalOnlyNotice")}
        </p>
      </div>
      {menuPath && menuUrl && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-card px-3 py-2.5 text-sm ring-1 ring-border" data-testid="dash-public-menu-link">
          <BookOpen className="size-4 shrink-0 text-brand-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{tMenu("dashLinkTitle")}</p>
            <p className="truncate text-xs text-muted">{menuUrl}</p>
          </div>
          <CopyLinkButton url={menuUrl} />
          <Link href={menuPath} target="_blank" className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
            <ExternalLink className="size-3.5" /> {tMenu("open")}
          </Link>
        </div>
      )}
      {qrSeed && <MenuQrCardPanel seed={qrSeed} />}
      <MenuManager categories={categories} items={items} optionGroups={optionGroups} />
    </div>
  );
}
