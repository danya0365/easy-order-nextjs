import { CustomerTabBar } from "@/src/presentation/components/layout/CustomerTabBar";
import { AppVersion } from "@/src/presentation/components/layout/AppVersion";

/**
 * Customer-facing shell: every public page (map, my cards, a shop card, info,
 * privacy) gets the bottom tab bar. The padding-bottom reserves space so the
 * fixed bar never covers page content (incl. the iOS safe-area inset).
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      {children}
      <AppVersion />
      <CustomerTabBar />
    </div>
  );
}
