"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

import { MapLoading } from "@/src/presentation/components/map/MapLoading";
import { Button } from "@/src/presentation/components/ui/Button";

// maplibre-gl touches `window`, so the editor is client-only (no SSR) and
// lazy-loaded, matching the public StoreMap wrapper + the lead picker.
const BranchLocationEditorView = dynamic(
  () => import("./BranchLocationEditorView"),
  {
    ssr: false,
    loading: () => <MapLoading className="h-56 rounded-lg border border-border" />,
  },
);

/**
 * Collapsed-by-default toggle that reveals the map picker for one branch — keeps
 * the branches list compact when a shop has several branches.
 */
export function BranchLocationEditor(props: {
  branchId: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}) {
  const t = useTranslations("map");
  const [open, setOpen] = useState(false);
  const hasLocation = props.latitude !== null && props.longitude !== null;

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <MapPin size={14} />
        {hasLocation ? t("editLocation") : t("setLocation")}
      </Button>
    );
  }

  return <BranchLocationEditorView {...props} />;
}
