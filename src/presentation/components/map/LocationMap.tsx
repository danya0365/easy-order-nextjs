"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  attachMapErrorHandler,
  BASEMAP_STYLE_URL,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
} from "./basemap-style";

export interface LocationMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  onChange: (coords: { lat: number; lng: number }) => void;
}

const roundCoord = (n: number) => Math.round(n * 1e6) / 1e6;

function createPinElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("data-testid", "location-map-pin");
  el.style.cssText =
    "cursor: grab; width: 40px; height: 48px; filter: drop-shadow(0 3px 6px rgba(15,23,42,.35));";
  el.innerHTML = `
    <svg width="40" height="48" viewBox="0 0 40 48" aria-hidden="true">
      <path fill="#ef4444" d="M20 0C9.5 0 1 8.5 1 19c0 13.2 19 29 19 29s19-15.8 19-29C39 8.5 30.5 0 20 0z"/>
      <circle cx="20" cy="19" r="7.5" fill="#ffffff"/>
      <circle cx="20" cy="19" r="3.5" fill="#ef4444"/>
    </svg>`;
  el.addEventListener("mousedown", () => (el.style.cursor = "grabbing"));
  el.addEventListener("mouseup", () => (el.style.cursor = "grab"));
  return el;
}

/** Client-only MapLibre map with one draggable DOM pin (OpenFreeMap Liberty). */
export default function LocationMap({ lat, lng, zoom = 16, onChange }: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE_URL,
      center: [lng, lat],
      zoom,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
    });
    attachMapErrorHandler(map);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    const marker = new maplibregl.Marker({ element: createPinElement(), draggable: true, anchor: "bottom" })
      .setLngLat([lng, lat])
      .addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLngLat();
      onChangeRef.current({ lat: roundCoord(p.lat), lng: roundCoord(p.lng) });
    });
    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      onChangeRef.current({ lat: roundCoord(e.lngLat.lat), lng: roundCoord(e.lngLat.lng) });
    });

    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Map is created once; prop changes are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep pin + view in sync when the parent moves it (GPS / search result).
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const cur = marker.getLngLat();
    if (Math.abs(cur.lat - lat) < 1e-7 && Math.abs(cur.lng - lng) < 1e-7) return;
    marker.setLngLat([lng, lat]);
    map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 16) });
  }, [lat, lng]);

  return <div ref={containerRef} className="h-full w-full" data-testid="location-map" />;
}
