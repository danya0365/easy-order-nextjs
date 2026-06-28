import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MonitorOff } from "lucide-react";

import { getKioskShopId, endKioskSession } from "@/src/infrastructure/auth/kiosk";
import { container } from "@/src/infrastructure/di/container";
import { GetKioskMenuUseCase } from "@/src/application/use-cases/menu/GetKioskMenuUseCase";
import { Button } from "@/src/presentation/components/ui/Button";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { KioskOrdering } from "@/src/presentation/components/kiosk/KioskOrdering";

export const dynamic = "force-dynamic";

export default async function KioskPage() {
  const t = await getTranslations("kiosk");
  const shopId = await getKioskShopId();

  // Not in kiosk mode: friendly screen (never crash) with a path back to login.
  if (!shopId) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 py-10">
        <EmptyState
          icon={<MonitorOff />}
          title={t("notActiveTitle")}
          description={t("notActiveDesc")}
          action={
            // Clear any stale eo_kiosk cookie before leaving, otherwise the proxy
            // kiosk lockdown would bounce /login straight back here (loop).
            <form
              action={async () => {
                "use server";
                await endKioskSession();
                redirect("/login");
              }}
            >
              <Button type="submit">{t("goToLogin")}</Button>
            </form>
          }
        />
      </div>
    );
  }

  const [shop, sections] = await Promise.all([
    container.shopRepository.findById(shopId),
    new GetKioskMenuUseCase(
      container.menuCategoryRepository,
      container.menuItemRepository,
    ).execute(shopId),
  ]);

  return (
    <KioskOrdering
      sections={sections}
      hasPromptpay={!!shop?.promptpayTarget}
      shopName={shop?.name ?? ""}
    />
  );
}
