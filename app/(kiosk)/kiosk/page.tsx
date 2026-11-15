import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MonitorOff, Store } from "lucide-react";

import { getKioskSession, endKioskSession } from "@/src/infrastructure/auth/kiosk";
import {
  branchClosedReason,
  resolveOrderBranch,
} from "@/src/domain/services/branch-ordering";
import { container } from "@/src/infrastructure/di/container";
import { GetKioskMenuUseCase } from "@/src/application/use-cases/menu/GetKioskMenuUseCase";
import { loadOrderingExtras } from "@/src/application/use-cases/menu/MenuOptionUseCases";
import { Button } from "@/src/presentation/components/ui/Button";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { KioskOrdering } from "@/src/presentation/components/kiosk/KioskOrdering";

export const dynamic = "force-dynamic";

export default async function KioskPage() {
  const t = await getTranslations("kiosk");
  const kiosk = await getKioskSession();
  const shopId = kiosk?.shopId ?? null;

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

  const [shop, allSections, branches] = await Promise.all([
    container.shopRepository.findById(shopId),
    new GetKioskMenuUseCase(
      container.menuCategoryRepository,
      container.menuItemRepository,
    ).execute(shopId),
    container.branchRepository.listByShop(shopId),
  ]);
  // The branch this kiosk device is bound to (legacy/unbound → main branch).
  const branch = resolveOrderBranch(branches, kiosk?.branchId);
  const multi = branches.filter((b) => b.isActive).length > 1;
  const shopName = shop?.name ?? "";
  const displayName = multi && branch ? `${shopName} · ${branch.name}` : shopName;

  // Closed branch: say so up-front instead of failing at checkout.
  const closed = branchClosedReason(branch);
  if (closed) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-6 px-6 py-10" data-testid="kiosk-branch-closed">
        {/* Re-check every minute so the kiosk recovers by itself when the branch reopens. */}
        <meta httpEquiv="refresh" content="60" />
        <EmptyState icon={<Store />} title={displayName} description={`${closed} — ${t("branchClosedDesc")}`} />
      </div>
    );
  }

  // Per-branch sold-out: hide items this branch has marked sold out.
  const soldOut = new Set(
    branch ? await container.branchRepository.listSoldOutItemIds(branch.id) : [],
  );
  const sections = soldOut.size
    ? allSections
        .map((sec) => ({ ...sec, items: sec.items.filter((i) => !soldOut.has(i.id)) }))
        .filter((sec) => sec.items.length > 0)
    : allSections;

  const extras = shop
    ? await loadOrderingExtras(
        container.platformSettingsRepository,
        container.menuOptionRepository,
        shop,
        sections.flatMap((sec) => sec.items.map((i) => i.id)),
      )
    : { optionGroups: null, itemDetailEnabled: false };

  return (
    <KioskOrdering
      optionGroups={extras.optionGroups}
      itemDetailEnabled={extras.itemDetailEnabled}
      sections={sections}
      hasPromptpay={!!shop?.promptpayTarget}
      shopName={displayName}
      selfService={!!shop?.selfService}
    />
  );
}
