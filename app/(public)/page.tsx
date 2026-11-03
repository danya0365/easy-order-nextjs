import { Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { StoreMap } from "@/src/presentation/components/map/StoreMap";

// Reads the live set of mapped shops on each request; revalidated when an owner
// updates a branch location.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const locations = await container.branchRepository.listMapLocations();
  const t = await getTranslations("publicPages");

  // Enrich pins with each shop's profile image + rating (batched, no N+1).
  const shopIds = [...new Set(locations.map((l) => l.shopId))];
  const [profiles, summaries] = await Promise.all([
    container.shopImageRepository.profilesByShop(shopIds),
    container.shopReviewRepository.summariesByShop(shopIds),
  ]);
  const mapLocations = locations.map((l) => ({
    ...l,
    profileImageId: profiles[l.shopId] ?? null,
    rating: summaries[l.shopId] ?? { average: 0, count: 0 },
  }));

  return (
    // Fill the viewport minus the shared header (h-14) + bottom tab bar (h-16).
    <main className="flex min-h-[calc(100dvh-7.5rem)] flex-col">
      <section className="relative flex-1">
        <div className="absolute inset-0">
          <StoreMap locations={mapLocations} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
          <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-card/90 px-4 py-1.5 text-sm font-medium text-foreground shadow-sm backdrop-blur">
            <Store size={16} className="text-brand-600" />
            {t("shopsParticipating", { count: locations.length })}
          </span>
        </div>
      </section>
    </main>
  );
}
