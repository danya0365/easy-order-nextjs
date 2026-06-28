"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
} from "react-map-gl/maplibre";
import { LocateFixed, MapPin, Search, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  createLeadAction,
  type LeadFormState,
} from "@/src/presentation/actions/lead-actions";
import type {
  GeoSearchResult,
  ReverseResult,
} from "@/src/application/services/IGeocoder";
import type { OsmPoi } from "@/src/domain/services/osm-poi";
import { Input } from "@/src/presentation/components/ui/Input";
import { Textarea } from "@/src/presentation/components/ui/Textarea";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";
import {
  OSM_STYLE,
  DEFAULT_CENTER,
} from "@/src/presentation/components/map/osm-style";

const SELECT_CLASS =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

/** Zoom at/above which we fetch POIs (keeps the Overpass bbox small). */
const POI_MIN_ZOOM = 15;

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function LeadCreateMapPickerView({
  categories,
}: {
  categories: Category[];
}) {
  const t = useTranslations("leads");
  const tc = useTranslations("common");
  const router = useRouter();
  const mapRef = useRef<MapRef>(null);
  const [state, action, pending] = useActionState<LeadFormState, FormData>(
    createLeadAction,
    {},
  );

  // Shared map state
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [pois, setPois] = useState<OsmPoi[]>([]);
  const [loadingPois, setLoadingPois] = useState(false);
  const [zoomLow, setZoomLow] = useState(true);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Search box
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Controlled form fields (prefilled from the map)
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [address, setAddress] = useState("");

  const poiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect to the list once a lead is created.
  useEffect(() => {
    if (state.success) router.push("/admin/leads");
  }, [state.success, router]);

  function categoryIdForSlug(slug: string | null): string {
    if (!slug) return "";
    return categories.find((c) => c.slug === slug)?.id ?? "";
  }

  function loadPois() {
    const map = mapRef.current;
    if (!map) return;
    const zoom = map.getZoom();
    if (zoom < POI_MIN_ZOOM) {
      setZoomLow(true);
      setPois([]);
      return;
    }
    setZoomLow(false);
    const b = map.getBounds();
    const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
    setLoadingPois(true);
    fetch(`/api/geo/pois?bbox=${bbox}`)
      .then((r) => (r.ok ? r.json() : { pois: [] }))
      .then((d: { pois: OsmPoi[] }) => setPois(d.pois ?? []))
      .catch(() => setPois([]))
      .finally(() => setLoadingPois(false));
  }

  function onMoveEnd() {
    if (poiTimer.current) clearTimeout(poiTimer.current);
    poiTimer.current = setTimeout(loadPois, 600);
  }

  function selectPoi(poi: OsmPoi) {
    setPos({ lat: poi.lat, lng: poi.lng });
    setName(poi.name);
    if (poi.phone) setPhone(poi.phone);
    if (poi.address) setAddress(poi.address);
    setCategoryId(categoryIdForSlug(poi.categorySlug));
    mapRef.current?.flyTo({ center: [poi.lng, poi.lat], zoom: 17 });
  }

  async function reverseFill(lat: number, lng: number) {
    try {
      const r = await fetch(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
      if (!r.ok) return;
      const data = (await r.json()) as ReverseResult;
      if (data.address) setAddress(data.address);
      // Only fill name/category if the user hasn't already (don't clobber edits).
      if (data.name && !name) setName(data.name);
      if (data.categorySlug && !categoryId) {
        setCategoryId(categoryIdForSlug(data.categorySlug));
      }
    } catch {
      /* best-effort */
    }
  }

  function onMapClick(lat: number, lng: number) {
    setPos({ lat, lng });
    void reverseFill(lat, lng);
  }

  function detectCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoError(tc("geoUnsupported"));
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        setPos({ lat, lng });
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 17 });
        void reverseFill(lat, lng);
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

  async function runSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    try {
      const r = await fetch(`/api/geo/search?q=${encodeURIComponent(q)}`);
      const data = (await r.json()) as { results: GeoSearchResult[] };
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function gotoResult(res: GeoSearchResult) {
    setResults([]);
    setQuery(res.name);
    mapRef.current?.flyTo({ center: [res.lng, res.lat], zoom: 16 });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runSearch();
              }
            }}
            placeholder={t("searchPlacePlaceholder")}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void runSearch()}
            disabled={searching}
          >
            <Search size={16} />
            {searching ? "…" : t("search")}
          </Button>
        </div>
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg">
            {results.map((res, i) => (
              <li key={`${res.lat},${res.lng},${i}`}>
                <button
                  type="button"
                  onClick={() => gotoResult(res)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-muted-surface"
                >
                  <span className="font-medium text-foreground">{res.name}</span>
                  {res.address && (
                    <span className="block truncate text-xs text-muted">
                      {res.address}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Map */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">{t("tapPoiHint")}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={detectCurrentLocation}
          disabled={locating}
        >
          <LocateFixed size={14} />
          {locating ? t("locatingShort") : tc("currentLocation")}
        </Button>
      </div>
      {geoError && <p className="text-xs text-error">{geoError}</p>}

      <div className="relative h-72 w-full overflow-hidden rounded-lg border border-border">
        <Map
          ref={mapRef}
          initialViewState={DEFAULT_CENTER}
          mapStyle={OSM_STYLE}
          style={{ width: "100%", height: "100%" }}
          attributionControl={{ compact: true }}
          onMoveEnd={onMoveEnd}
          onClick={(e) => onMapClick(e.lngLat.lat, e.lngLat.lng)}
        >
          <NavigationControl position="top-right" showCompass={false} />

          {/* OSM POI markers (tap to autofill) */}
          {pois.map((poi) => (
            <Marker
              key={poi.id}
              longitude={poi.lng}
              latitude={poi.lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                selectPoi(poi);
              }}
            >
              <Store
                size={20}
                className="cursor-pointer fill-amber-400 text-amber-700 drop-shadow"
              />
            </Marker>
          ))}

          {/* The chosen lead pin (draggable) */}
          {pos && (
            <Marker
              longitude={pos.lng}
              latitude={pos.lat}
              anchor="bottom"
              draggable
              onDragEnd={(e) => onMapClick(e.lngLat.lat, e.lngLat.lng)}
            >
              <MapPin
                size={32}
                className="cursor-grab fill-brand-500 text-white drop-shadow active:cursor-grabbing"
              />
            </Marker>
          )}
        </Map>

        {/* Status chip */}
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
          <span className="pointer-events-auto rounded-full bg-card/90 px-3 py-1 text-xs text-muted shadow-sm backdrop-blur">
            {loadingPois
              ? t("loadingPois")
              : zoomLow
                ? t("zoomForPois")
                : t("poisFound", { count: pois.length })}
          </span>
        </div>
      </div>

      {/* Form (prefilled, editable) */}
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="latitude" value={pos ? pos.lat : ""} />
        <input type="hidden" name="longitude" value={pos ? pos.lng : ""} />

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t("shopName")} htmlFor="name">
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </FormField>
          <FormField label={t("phone")} htmlFor="phone">
            <Input
              id="phone"
              name="phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </FormField>
          <FormField label={t("category")} htmlFor="categoryId">
            <select
              id="categoryId"
              name="categoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">{t("categoryNone")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("nextFollowUp")} htmlFor="nextFollowUpAt">
            <Input id="nextFollowUpAt" name="nextFollowUpAt" type="date" />
          </FormField>
        </div>

        <FormField label={t("addressLabel")} htmlFor="address">
          <Input
            id="address"
            name="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={200}
          />
        </FormField>

        <FormField label={t("notes")} htmlFor="notes">
          <Textarea id="notes" name="notes" rows={2} />
        </FormField>

        <p className="text-xs text-muted">
          {pos
            ? t("pinnedAt", {
                coords: `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`,
              })
            : t("notPinnedTapMap")}
        </p>

        {state.error && <p className="text-sm text-error">{state.error}</p>}

        <Button type="submit" disabled={pending}>
          {pending ? t("adding") : t("addLead")}
        </Button>
      </form>
    </div>
  );
}
