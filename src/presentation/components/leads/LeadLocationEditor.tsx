"use client";

import dynamic from "next/dynamic";

import { MapLoading } from "@/src/presentation/components/map/MapLoading";

// maplibre-gl touches `window`, so the editor is client-only (no SSR) and
// lazy-loaded, matching the public StoreMap wrapper.
const LeadLocationEditorView = dynamic(() => import("./LeadLocationEditorView"), {
  ssr: false,
  loading: () => (
    <MapLoading className="h-56 rounded-lg border border-border" />
  ),
});

export function LeadLocationEditor(props: {
  leadId: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}) {
  return <LeadLocationEditorView {...props} />;
}
