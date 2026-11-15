import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { GetKioskMenuUseCase } from "@/src/application/use-cases/menu/GetKioskMenuUseCase";
import { StaffOrderEntry } from "@/src/presentation/components/order/StaffOrderEntry";

export const dynamic = "force-dynamic";

export default async function StaffHomePage() {
  const user = await requireRole("branch_staff");
  const shopId = user.shopId;
  if (!shopId) return null;

  const [shop, allSections, customers, branchSoldOut, branches] = await Promise.all([
    container.shopRepository.findById(shopId),
    new GetKioskMenuUseCase(
      container.menuCategoryRepository,
      container.menuItemRepository,
    ).execute(shopId),
    container.customerRepository.listByShop(shopId),
    user.branchId
      ? container.branchRepository.listSoldOutItemIds(user.branchId)
      : Promise.resolve([] as string[]),
    container.branchRepository.listByShop(shopId),
  ]);
  // Multi-branch shops: show a fixed "สั่งที่สาขา X" label (server enforces it).
  const myBranch =
    branches.filter((b) => b.isActive).length > 1
      ? branches.find((b) => b.id === user.branchId)
      : undefined;
  // Hide items sold out at this staff member's branch (menu is shop-wide).
  const soldOut = new Set(branchSoldOut);
  const sections = soldOut.size
    ? allSections
        .map((sec) => ({ ...sec, items: sec.items.filter((i) => !soldOut.has(i.id)) }))
        .filter((sec) => sec.items.length > 0)
    : allSections;

  return (
    <StaffOrderEntry
      sections={sections}
      hasPromptpay={!!shop?.promptpayTarget}
      customers={customers.map((c) => ({
        id: c.id,
        phone: c.phone,
        displayName: c.displayName,
      }))}
      branches={myBranch ? [{ id: myBranch.id, name: myBranch.name }] : []}
      defaultBranchId={myBranch?.id ?? null}
      branchLocked
    />
  );
}
