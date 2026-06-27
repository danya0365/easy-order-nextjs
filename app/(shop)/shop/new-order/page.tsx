import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { GetKioskMenuUseCase } from "@/src/application/use-cases/menu/GetKioskMenuUseCase";
import { StaffOrderEntry } from "@/src/presentation/components/order/StaffOrderEntry";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const { shopId } = await requireShopAccess();

  const [shop, sections, customers] = await Promise.all([
    container.shopRepository.findById(shopId),
    new GetKioskMenuUseCase(
      container.menuCategoryRepository,
      container.menuItemRepository,
    ).execute(shopId),
    container.customerRepository.listByShop(shopId),
  ]);

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
