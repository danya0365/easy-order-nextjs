import { getKioskShopId } from "@/src/infrastructure/auth/kiosk";
import { container } from "@/src/infrastructure/di/container";
import { BRAND } from "@/src/config/brand";
import { KioskExitButton } from "@/src/presentation/components/kiosk/KioskExitButton";

export const dynamic = "force-dynamic";

export default async function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shopId = await getKioskShopId();
  const shop = shopId ? await container.shopRepository.findById(shopId) : null;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-foreground">
            {shop?.name ?? BRAND.name}
          </p>
          {shop && <p className="text-xs text-muted">{BRAND.name}</p>}
        </div>
        {shopId && <KioskExitButton />}
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
