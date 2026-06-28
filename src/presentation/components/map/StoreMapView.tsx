"use client";

import { useState } from "react";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  GeolocateControl,
} from "react-map-gl/maplibre";
import { ArrowRight, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { ShopMapLocation } from "@/src/application/repositories/IBranchRepository";
import type { ReviewSummary } from "@/src/domain/entities";
import { StarRating } from "@/src/presentation/components/ui/StarRating";
import { OSM_STYLE, DEFAULT_CENTER, boundsOf } from "./osm-style";

/** A pinned shop branch, enriched with the shop's profile image + rating. */
export type MapShopLocation = ShopMapLocation & {
  profileImageId?: string | null;
  rating?: ReviewSummary;
};

export default function StoreMapView({
  locations,
}: {
  locations: MapShopLocation[];
}) {
  const t = useTranslations("map");
  const [active, setActive] = useState<MapShopLocation | null>(null);

  const bounds = boundsOf(locations);
  const initialViewState = bounds
    ? { bounds, fitBoundsOptions: { padding: 48, maxZoom: 15 } }
    : DEFAULT_CENTER;

  return (
    <Map
      initialViewState={initialViewState}
      mapStyle={OSM_STYLE}
      style={{ width: "100%", height: "100%" }}
      attributionControl={{ compact: true }}
    >
      <NavigationControl position="top-right" showCompass={false} />
      {/* "Locate me" — centers the map on the user so they can spot nearby shops. */}
      <GeolocateControl
        position="top-right"
        positionOptions={{ enableHighAccuracy: true }}
        trackUserLocation
        showUserLocation
      />

      {locations.map((loc) => (
        <Marker
          key={loc.branchId}
          longitude={loc.longitude}
          latitude={loc.latitude}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setActive(loc);
          }}
        >
          <MapPin
            size={30}
            className="cursor-pointer fill-brand-500 text-white drop-shadow"
          />
        </Marker>
      ))}

      {active && (
        <Popup
          longitude={active.longitude}
          latitude={active.latitude}
          anchor="bottom"
          offset={28}
          closeButton
          closeOnClick={false}
          onClose={() => setActive(null)}
          maxWidth="250px"
        >
          <div className="w-[226px] p-3">
            <div className="flex items-center gap-2.5 pr-5">
              {active.profileImageId && (
                // eslint-disable-next-line @next/next/no-img-element -- internal image route
                <img
                  src={`/api/shop-images/${active.profileImageId}`}
                  alt={active.shopName}
                  className="size-11 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {active.shopName}
                </p>
                <p className="truncate text-xs text-muted">
                  {active.categoryName
                    ? `${active.categoryName} · ${active.branchName}`
                    : active.branchName}
                </p>
              </div>
            </div>
            {active.rating && active.rating.count > 0 && (
              <div className="mt-1.5 flex items-center gap-1">
                <StarRating value={active.rating.average} size="sm" />
                <span className="text-xs text-muted">
                  {active.rating.average.toFixed(1)} ({active.rating.count})
                </span>
              </div>
            )}
            {active.address && (
              <p className="mt-1 line-clamp-2 text-xs text-muted">
                {active.address}
              </p>
            )}
            <a
              href={`/s/${active.shopSlug}`}
              className="mt-2.5 flex items-center justify-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-medium text-on-brand transition hover:bg-brand-600"
            >
              {t("viewShop")}
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </Popup>
      )}
    </Map>
  );
}
