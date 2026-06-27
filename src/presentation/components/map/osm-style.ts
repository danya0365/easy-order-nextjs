import type { StyleSpecification } from "maplibre-gl";

/**
 * Free OpenStreetMap raster style — no API key required.
 *
 * NOTE: this points at OSM's community tile servers, whose usage policy
 * (https://operations.osmfoundation.org/policies/tiles/) forbids heavy traffic.
 * Fine for launch / low volume; swap `tiles` for a proper provider (MapTiler,
 * Protomaps, self-hosted) before serious production load.
 */
export const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

/** Bangkok — fallback center when there are no pins yet. */
export const DEFAULT_CENTER = { longitude: 100.5018, latitude: 13.7563, zoom: 10 };

/** Bounding box `[ [west, south], [east, north] ]` padded around a set of points. */
export function boundsOf(
  points: { latitude: number; longitude: number }[],
): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const p of points) {
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
  }
  // Pad so single/clustered points aren't zoomed in to street level.
  const pad = 0.02;
  return [
    [minLng - pad, minLat - pad],
    [maxLng + pad, maxLat + pad],
  ];
}
