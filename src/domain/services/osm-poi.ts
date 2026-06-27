/**
 * Pure helpers for turning OpenStreetMap tags into the shapes the lead form
 * needs: a normalized POI, a shop category slug, and a human address. No I/O so
 * it stays unit-testable; the OSM HTTP client lives in infrastructure.
 */

export interface OsmTags {
  [key: string]: string | undefined;
}

export interface OsmPoi {
  /** Stable id like "node/123" or "way/456". */
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Mapped to one of our shop-category slugs, or null when unknown. */
  categorySlug: string | null;
  phone: string | null;
  address: string | null;
}

/**
 * Map OSM `shop=*` / `amenity=*` tags to a shop-category slug. Slugs must match
 * the seed in scripts/seed/production.ts: coffee, bakery, food, beverage,
 * beauty, retail, other.
 */
export function osmTagsToCategorySlug(tags: OsmTags): string | null {
  const shop = tags.shop;
  const amenity = tags.amenity;

  if (amenity === "cafe" || shop === "coffee") return "coffee";
  if (
    shop === "bakery" ||
    shop === "pastry" ||
    shop === "confectionery" ||
    amenity === "ice_cream"
  ) {
    return "bakery";
  }
  if (
    amenity === "restaurant" ||
    amenity === "fast_food" ||
    amenity === "food_court"
  ) {
    return "food";
  }
  if (
    amenity === "bar" ||
    amenity === "pub" ||
    shop === "beverages" ||
    shop === "alcohol"
  ) {
    return "beverage";
  }
  if (
    amenity === "spa" ||
    amenity === "beauty" ||
    shop === "beauty" ||
    shop === "hairdresser" ||
    shop === "cosmetics" ||
    shop === "massage"
  ) {
    return "beauty";
  }
  // Any other retail storefront.
  if (shop) return "retail";
  // Has a name + is one of the food/amenity POIs we queried but unmatched above.
  if (amenity) return "other";
  return null;
}

/** First non-empty phone-like tag. */
export function pickPhone(tags: OsmTags): string | null {
  return (
    tags.phone ||
    tags["contact:phone"] ||
    tags["contact:mobile"] ||
    tags.mobile ||
    null
  );
}

/**
 * Build a readable Thai address from `addr:*` tags, falling back to `addr:full`.
 * Returns null when there's nothing usable; capped at 200 chars (the lead
 * address column / validation limit).
 */
export function buildAddress(tags: OsmTags): string | null {
  if (tags["addr:full"]) return tags["addr:full"].slice(0, 200);

  const parts = [
    [tags["addr:housenumber"], tags["addr:street"]]
      .filter(Boolean)
      .join(" ")
      .trim(),
    tags["addr:subdistrict"] || tags["addr:suburb"] || tags["addr:village"],
    tags["addr:district"] || tags["addr:city_district"] || tags["addr:city"],
    tags["addr:province"] || tags["addr:state"],
    tags["addr:postcode"],
  ].filter((p): p is string => !!p && p.length > 0);

  if (parts.length === 0) return null;
  return parts.join(" ").slice(0, 200);
}
