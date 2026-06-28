"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import type { LeadMapLocation } from "@/src/domain/entities";
import { MapLoading } from "@/src/presentation/components/map/MapLoading";

// maplibre-gl touches `window`, so the map is client-only (no SSR) and lazy-loaded.
const LeadMapView = dynamic(() => import("./LeadMapView"), {
  ssr: false,
  loading: () => <MapLoading />,
});

export function LeadMap({ locations }: { locations: LeadMapLocation[] }) {
  const t = useTranslations("leads");
  return (
    <div className="relative h-full w-full overflow-hidden">
      <LeadMapView locations={locations} />
      {locations.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <p className="pointer-events-auto rounded-full bg-card/90 px-4 py-1.5 text-xs text-muted shadow-sm backdrop-blur">
            {t("noPinnedLeads")}
          </p>
        </div>
      )}
    </div>
  );
}
