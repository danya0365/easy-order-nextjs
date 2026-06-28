"use client";

import { useActionState, useRef, useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
} from "react-map-gl/maplibre";
import { LocateFixed, MapPin, Navigation } from "lucide-react";
import { useTranslations } from "next-intl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  updateLeadLocationAction,
  type LeadFormState,
} from "@/src/presentation/actions/lead-actions";
import { Input } from "@/src/presentation/components/ui/Input";
import { Button } from "@/src/presentation/components/ui/Button";
import { OSM_STYLE, DEFAULT_CENTER } from "@/src/presentation/components/map/osm-style";

interface Props {
  leadId: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

export default function LeadLocationEditorView({
  leadId,
  latitude,
  longitude,
  address,
}: Props) {
  const t = useTranslations("leads");
  const tc = useTranslations("common");
  const [pos, setPos] = useState<{ lng: number; lat: number } | null>(
    latitude !== null && longitude !== null
      ? { lng: longitude, lat: latitude }
      : null,
  );
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const mapRef = useRef<MapRef>(null);
  const [state, action, pending] = useActionState<LeadFormState, FormData>(
    updateLeadLocationAction,
    {},
  );

  function detectCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoError(tc("geoUnsupported"));
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lng = p.coords.longitude;
        const lat = p.coords.latitude;
        setPos({ lng, lat });
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 16 });
        setLocating(false);
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? tc("geoPermissionDenied")
            : tc("geoFailed"),
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const initialViewState = pos
    ? { longitude: pos.lng, latitude: pos.lat, zoom: 15 }
    : DEFAULT_CENTER;

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">{t("tapToPin")}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={detectCurrentLocation}
          disabled={locating}
        >
          <LocateFixed size={14} />
          {locating ? t("locating") : tc("currentLocation")}
        </Button>
      </div>
      {geoError && <p className="text-xs text-error">{geoError}</p>}

      <div className="h-56 w-full overflow-hidden rounded-lg border border-border">
        <Map
          ref={mapRef}
          initialViewState={initialViewState}
          mapStyle={OSM_STYLE}
          style={{ width: "100%", height: "100%" }}
          attributionControl={{ compact: true }}
          onClick={(e) => setPos({ lng: e.lngLat.lng, lat: e.lngLat.lat })}
        >
          <NavigationControl position="top-right" showCompass={false} />
          {pos && (
            <Marker
              longitude={pos.lng}
              latitude={pos.lat}
              anchor="bottom"
              draggable
              onDragEnd={(e) =>
                setPos({ lng: e.lngLat.lng, lat: e.lngLat.lat })
              }
            >
              <MapPin
                size={30}
                className="cursor-grab fill-brand-500 text-white drop-shadow active:cursor-grabbing"
              />
            </Marker>
          )}
        </Map>
      </div>

      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="latitude" value={pos ? pos.lat : ""} />
      <input type="hidden" name="longitude" value={pos ? pos.lng : ""} />

      <Input
        name="address"
        placeholder={t("addressPlaceholderOptional")}
        defaultValue={address ?? ""}
        maxLength={200}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted">
          {pos
            ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`
            : t("notPinned")}
        </span>
        <div className="flex gap-2">
          {pos && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${pos.lat},${pos.lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button type="button" variant="outline" size="sm">
                <Navigation size={14} />
                {tc("navigate")}
              </Button>
            </a>
          )}
          {pos && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPos(null)}
            >
              {t("clearPin")}
            </Button>
          )}
          <Button type="submit" size="sm" disabled={pending}>
            {t("saveLocation")}
          </Button>
        </div>
      </div>

      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}
    </form>
  );
}
