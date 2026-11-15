import { cookies } from "next/headers";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { GetKioskMenuUseCase } from "@/src/application/use-cases/menu/GetKioskMenuUseCase";
import { mainBranchOf } from "@/src/domain/services/branch-ordering";
import { COUNTER_BRANCH_COOKIE } from "@/src/presentation/lib/counter-branch";
import {
  StaffOrderEntry,
  type CounterBranchOption,
} from "@/src/presentation/components/order/StaffOrderEntry";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const { shopId } = await requireShopAccess();

  const [shop, sections, customers, branches, jar] = await Promise.all([
    container.shopRepository.findById(shopId),
    new GetKioskMenuUseCase(
      container.menuCategoryRepository,
      container.menuItemRepository,
    ).execute(shopId),
    container.customerRepository.listByShop(shopId),
    container.branchRepository.listByShop(shopId),
    cookies(),
  ]);

  // Multi-branch: owner picks the walk-in branch (default = last used, else main).
  let branchOptions: CounterBranchOption[] = [];
  let defaultBranchId: string | null = null;
  const active = branches.filter((b) => b.isActive);
  if (active.length > 1) {
    branchOptions = await Promise.all(
      active.map(async (b) => ({
        id: b.id,
        name: b.name,
        closed: !b.acceptingOrders,
        soldOutIds: await container.branchRepository.listSoldOutItemIds(b.id),
      })),
    );
    const last = jar.get(COUNTER_BRANCH_COOKIE)?.value;
    defaultBranchId = active.some((b) => b.id === last)
      ? last!
      : (mainBranchOf(active)?.id ?? null);
  }

  return (
    <StaffOrderEntry
      sections={sections}
      hasPromptpay={!!shop?.promptpayTarget}
      customers={customers.map((c) => ({
        id: c.id,
        phone: c.phone,
        displayName: c.displayName,
      }))}
      branches={branchOptions}
      defaultBranchId={defaultBranchId}
    />
  );
}
