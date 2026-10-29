import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { MenuManager } from "@/src/presentation/components/menu/MenuManager";

export const dynamic = "force-dynamic";

export default async function ShopMenuPage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("shopPages");
  const [categories, items] = await Promise.all([
    container.menuCategoryRepository.listByShop(shopId),
    container.menuItemRepository.listByShop(shopId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("menuTitle")}</h1>
        <p className="mt-0.5 text-sm text-muted">{t("menuSubtitle")}</p>
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          {t("halalOnlyNotice")}
        </p>
      </div>
      <MenuManager categories={categories} items={items} />
    </div>
  );
}
