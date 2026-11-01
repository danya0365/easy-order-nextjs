/** OSM-compatible tiles usually stop around z19 — going higher causes fetch errors. */
export const MAP_MAX_ZOOM = 19;
export const MAP_MIN_ZOOM = 2;

/**
 * Free MapLibre style (no API key) — OpenFreeMap Liberty.
 * @see https://openfreemap.org/
 */
export const BASEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/** Swallow intermittent tile network blips so they don't trip Next.js error overlays. */
export function attachMapErrorHandler(map: {
  on: (type: "error", fn: (e: { error?: Error }) => void) => void;
}) {
  map.on("error", (e) => {
    const msg = e.error?.message ?? String(e.error ?? "");
    if (/Failed to fetch|AJAXError|tile|api key/i.test(msg)) {
      console.warn("[map] tile load failed (ignored):", msg);
      return;
    }
    console.error("[map]", e.error);
  });
}
