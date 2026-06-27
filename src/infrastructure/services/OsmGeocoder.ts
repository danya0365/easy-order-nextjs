import "server-only";

import type {
  GeoBBox,
  GeoSearchResult,
  IGeocoder,
  ReverseResult,
} from "@/src/application/services/IGeocoder";
import {
  buildAddress,
  osmTagsToCategorySlug,
  pickPhone,
  type OsmPoi,
  type OsmTags,
} from "@/src/domain/services/osm-poi";
import { BRAND } from "@/src/config/brand";
import { retry } from "@/src/infrastructure/services/retry";
import { logger } from "@/src/infrastructure/observability/logger";

interface GeocoderConfig {
  overpassUrl: string;
  nominatimUrl: string;
  userAgent: string;
}

/** Reads geocoding endpoints/UA from env, with free OSM defaults (no setup). */
export function geocoderConfigFromEnv(): GeocoderConfig {
  return {
    overpassUrl:
      process.env.OSM_OVERPASS_URL ?? "https://overpass-api.de/api/interpreter",
    nominatimUrl:
      process.env.OSM_NOMINATIM_URL ?? "https://nominatim.openstreetmap.org",
    userAgent: process.env.GEO_USER_AGENT ?? BRAND.userAgent,
  };
}

export function createGeocoder(): IGeocoder {
  return new OsmGeocoder(geocoderConfigFromEnv());
}

const REQUEST_TIMEOUT_MS = 8000;
const POI_LIMIT = 60;

/** Tiny TTL cache to avoid hammering the (fair-use) community endpoints. */
class TtlCache<T> {
  private readonly store = new Map<string, { at: number; data: T }>();
  constructor(
    private readonly ttlMs: number,
    private readonly max = 200,
  ) {}

  get(key: string): T | null {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at > this.ttlMs) {
      this.store.delete(key);
      return null;
    }
    return hit.data;
  }

  set(key: string, data: T): void {
    if (this.store.size >= this.max) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { at: Date.now(), data });
  }
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OsmTags;
}

interface NominatimPlace {
  lat: string;
  lon: string;
  display_name?: string;
  name?: string;
  category?: string;
  type?: string;
  address?: Record<string, string>;
}

export class OsmGeocoder implements IGeocoder {
  private readonly poiCache = new TtlCache<OsmPoi[]>(60_000);
  private readonly reverseCache = new TtlCache<ReverseResult>(300_000);
  private readonly searchCache = new TtlCache<GeoSearchResult[]>(300_000);

  constructor(private readonly config: GeocoderConfig) {}

  private async fetchJson<T>(
    url: string,
    init?: RequestInit,
  ): Promise<T | null> {
    // Retry transient failures (network/timeout, plus 5xx/429 — the community
    // OSM endpoints rate-limit and hiccup). A 4xx is permanent, so we return
    // null without retrying. Fail-soft: any leftover error → null (no throw).
    try {
      return await retry(
        async () => {
          const controller = new AbortController();
          const timer = setTimeout(
            () => controller.abort(),
            REQUEST_TIMEOUT_MS,
          );
          try {
            const res = await fetch(url, {
              ...init,
              signal: controller.signal,
              headers: {
                "User-Agent": this.config.userAgent,
                "Accept-Language": "th",
                ...(init?.headers ?? {}),
              },
              cache: "no-store",
            });
            if (!res.ok) {
              if (res.status >= 500 || res.status === 429) {
                throw new Error(`${res.status} from ${url}`);
              }
              logger.warn("geo non-retryable response", {
                scope: "geo",
                status: res.status,
                url,
              });
              return null;
            }
            return (await res.json()) as T;
          } finally {
            clearTimeout(timer);
          }
        },
        {
          retries: 2,
          onRetry: (e, n) =>
            logger.warn("geo retry", {
              scope: "geo",
              attempt: n,
              err: (e as Error).message,
            }),
        },
      );
    } catch (e) {
      logger.error("geo request failed", {
        scope: "geo",
        err: (e as Error).message,
      });
      return null;
    }
  }

  async searchPois(bbox: GeoBBox): Promise<OsmPoi[]> {
    const box = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
    const key = box;
    const cached = this.poiCache.get(key);
    if (cached) return cached;

    // Storefronts (any shop with a name) + the food/leisure amenities we care about.
    const ql = `[out:json][timeout:8];(nwr["shop"]["name"](${box});nwr["amenity"~"^(cafe|restaurant|fast_food|food_court|bar|pub|spa|ice_cream)$"]["name"](${box}););out center tags ${POI_LIMIT};`;

    const data = await this.fetchJson<{ elements?: OverpassElement[] }>(
      this.config.overpassUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(ql)}`,
      },
    );

    const pois: OsmPoi[] = [];
    const seen = new Set<string>();
    for (const el of data?.elements ?? []) {
      const tags = el.tags ?? {};
      const name = tags.name;
      if (!name) continue;
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (lat === undefined || lng === undefined) continue;
      // De-dupe a shop mapped as both node and way at the same name+spot.
      const dedupe = `${name}@${lat.toFixed(5)},${lng.toFixed(5)}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      pois.push({
        id: `${el.type}/${el.id}`,
        name,
        lat,
        lng,
        categorySlug: osmTagsToCategorySlug(tags),
        phone: pickPhone(tags),
        address: buildAddress(tags),
      });
    }

    this.poiCache.set(key, pois);
    return pois;
  }

  async reverse(lat: number, lng: number): Promise<ReverseResult> {
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const cached = this.reverseCache.get(key);
    if (cached) return cached;

    const url = `${this.config.nominatimUrl}/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`;
    const place = await this.fetchJson<NominatimPlace>(url);

    const result: ReverseResult = place
      ? {
          address: nominatimAddress(place),
          name: place.name || null,
          categorySlug: place.category
            ? osmTagsToCategorySlug({ [place.category]: place.type })
            : null,
        }
      : { address: null, name: null, categorySlug: null };

    this.reverseCache.set(key, result);
    return result;
  }

  async search(query: string): Promise<GeoSearchResult[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const cached = this.searchCache.get(q);
    if (cached) return cached;

    const url = `${this.config.nominatimUrl}/search?format=jsonv2&countrycodes=th&addressdetails=1&limit=8&q=${encodeURIComponent(q)}`;
    const places = await this.fetchJson<NominatimPlace[]>(url);

    const results: GeoSearchResult[] = (places ?? [])
      .map((p) => ({
        name: p.name || p.display_name || "",
        lat: Number(p.lat),
        lng: Number(p.lon),
        address: p.display_name?.slice(0, 200) ?? null,
      }))
      .filter((r) => r.name && Number.isFinite(r.lat) && Number.isFinite(r.lng));

    this.searchCache.set(q, results);
    return results;
  }
}

/** Compose a short Thai address from Nominatim's address object. */
function nominatimAddress(place: NominatimPlace): string | null {
  const a = place.address;
  if (!a) return place.display_name?.slice(0, 200) ?? null;
  const parts = [
    [a.house_number, a.road].filter(Boolean).join(" ").trim(),
    a.suburb || a.neighbourhood || a.village || a.subdistrict,
    a.city_district || a.city || a.town || a.district,
    a.state || a.province,
    a.postcode,
  ].filter((p): p is string => !!p && p.length > 0);
  if (parts.length === 0) return place.display_name?.slice(0, 200) ?? null;
  return parts.join(" ").slice(0, 200);
}
