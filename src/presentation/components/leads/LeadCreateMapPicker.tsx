"use client";

import dynamic from "next/dynamic";

import { MapLoading } from "@/src/presentation/components/map/MapLoading";

// maplibre-gl touches `window`, so the picker is client-only (no SSR) and
// lazy-loaded, matching the other lead map wrappers.
const LeadCreateMapPickerView = dynamic(
  () => import("./LeadCreateMapPickerView"),
  {
    ssr: false,
    loading: () => (
      <MapLoading className="h-72 rounded-lg border border-border" />
    ),
  },
);

export function LeadCreateMapPicker({
  categories,
}: {
  categories: { id: string; name: string; slug: string }[];
}) {
  return <LeadCreateMapPickerView categories={categories} />;
}
