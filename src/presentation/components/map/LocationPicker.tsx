"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";

import { MapLoading } from "./MapLoading";

// maplibre-gl touches `window` → client-only, lazy, with a placeholder.
const LocationMap = dynamic(() => import("./LocationMap"), {
  ssr: false,
  loading: () => <MapLoading />,
});

export interface LatLng {
  lat: number;
  lng: number;
}

interface PlaceSuggestion extends LatLng {
  id: string;
  label: string;
}

const PHOTON = "https://photon.komoot.io";
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

function formatPhotonLabel(props: Record<string, unknown>): string {
  const parts = [
    [props.housenumber, props.street].filter(Boolean).join(" ") || props.name,
    props.name !== props.street ? props.name : null,
    props.district ?? props.locality,
    props.city ?? props.town ?? props.village ?? props.county,
    props.state,
    props.postcode,
  ]
    .map((p) => (p == null ? "" : String(p).trim()))
    .filter(Boolean);
  const unique: string[] = [];
  for (const p of parts) if (!unique.includes(p)) unique.push(p);
  return unique.join(", ");
}

type PhotonFeature = { geometry?: { coordinates?: [number, number] }; properties?: Record<string, unknown> };

async function searchPlaces(q: string, near: LatLng, signal: AbortSignal): Promise<PlaceSuggestion[]> {
  const url = new URL(`${PHOTON}/api/`);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "6");
  url.searchParams.set("lat", String(near.lat));
  url.searchParams.set("lon", String(near.lng));
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? [])
    .map((f, i) => {
      const c = f.geometry?.coordinates;
      if (!c) return null;
      return { id: `${i}-${c[0]}-${c[1]}`, label: formatPhotonLabel(f.properties ?? {}), lat: round6(c[1]), lng: round6(c[0]) };
    })
    .filter((x): x is PlaceSuggestion => x != null && !!x.label);
}

async function reverseLabel(p: LatLng, signal: AbortSignal): Promise<string | null> {
  const url = new URL(`${PHOTON}/reverse`);
  url.searchParams.set("lat", String(p.lat));
  url.searchParams.set("lon", String(p.lng));
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: PhotonFeature[] };
  const props = data.features?.[0]?.properties;
  return props ? formatPhotonLabel(props) || null : null;
}

export interface LocationPickerProps {
  /** Current pin; null until the customer sets one. */
  value: LatLng | null;
  /** Where the map opens before a pin exists (shop branch / Thailand). */
  fallbackCenter: LatLng;
  fallbackZoom: number;
  onChange: (p: LatLng) => void;
  /** Reverse-geocoded address for the pin (prefills the address box). */
  onPlaceLabel?: (label: string) => void;
}

/**
 * Drag-pin location picker: OpenFreeMap map + GPS button + Photon search and
 * reverse geocoding (client-side, debounced). Copied from OK Studio's approach.
 */
export function LocationPicker({ value, fallbackCenter, fallbackZoom, onChange, onPlaceLabel }: LocationPickerProps) {
  const t = useTranslations("map");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const onLabelRef = useRef(onPlaceLabel);
  useEffect(() => {
    onLabelRef.current = onPlaceLabel;
  }, [onPlaceLabel]);

  // Debounced Photon search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(q, value ?? fallbackCenter, ctrl.signal)
        .then(setSuggestions)
        .catch(() => {});
    }, 320);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Debounced reverse geocode whenever the pin moves.
  useEffect(() => {
    if (!value) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      reverseLabel(value, ctrl.signal)
        .then((l) => {
          if (!l) return;
          setLabel(l);
          onLabelRef.current?.(l);
        })
        .catch(() => {});
    }, 400);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [value]);

  function useGps() {
    if (!("geolocation" in navigator)) {
      setGpsError(t("gpsUnavailable"));
      return;
    }
    setLocating(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({ lat: round6(pos.coords.latitude), lng: round6(pos.coords.longitude) });
      },
      () => {
        setLocating(false);
        setGpsError(t("gpsDenied"));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }

  const center = value ?? fallbackCenter;

  return (
    <div className="space-y-2" data-testid="location-picker">
      <button
        type="button"
        onClick={useGps}
        disabled={locating}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-500 px-4 py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 disabled:opacity-60"
      >
        {locating ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
        {t("useCurrentLocation")}
      </button>
      {gpsError && <p className="text-xs text-red-600">{gpsError}</p>}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 3) setSuggestions([]);
          }}
          placeholder={t("searchPlace")}
          className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm"
        />
        {suggestions.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-xl border border-border bg-card shadow-lg">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50"
                  onClick={() => {
                    onChange({ lat: s.lat, lng: s.lng });
                    setSuggestions([]);
                    setQuery("");
                  }}
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative h-64 overflow-hidden rounded-xl border border-border">
        <LocationMap lat={center.lat} lng={center.lng} zoom={value ? 16 : fallbackZoom} onChange={onChange} />
      </div>
      <p className="text-xs text-muted" data-testid="location-picker-status">
        {value ? t("pinSet", { lat: value.lat, lng: value.lng }) : t("pinHint")}
        {value && label ? ` · ${label}` : ""}
      </p>
      {value && (
        <>
          <input type="hidden" name="deliveryLat" value={value.lat} data-testid="delivery-lat" />
          <input type="hidden" name="deliveryLng" value={value.lng} data-testid="delivery-lng" />
        </>
      )}
    </div>
  );
}
