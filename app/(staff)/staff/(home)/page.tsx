import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { GetKioskMenuUseCase } from "@/src/application/use-cases/menu/GetKioskMenuUseCase";
import { StaffOrderEntry } from "@/src/presentation/components/order/StaffOrderEntry";

export const dynamic = "force-dynamic";

export default async function StaffHomePage() {
  const user = await requireRole("branch_staff");
  const shopId = user.shopId;
  if (!shopId) return null;

  const [shop, allSections, customers, branchSoldOut] = await Promise.all([
    container.shopRepository.findById(shopId),
    new GetKioskMenuUseCase(
      container.menuCategoryRepository,
      container.menuItemRepository,
    ).execute(shopId),
    container.customerRepository.listByShop(shopId),
    user.branchId
      ? container.branchRepository.listSoldOutItemIds(user.branchId)
      : Promise.resolve([] as string[]),
  ]);
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
    />
  );
}
