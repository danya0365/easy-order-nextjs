import type { OsmPoi } from "@/src/domain/services/osm-poi";

export interface GeoBBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface ReverseResult {
  address: string | null;
  /** Name of the POI at the point, if any (else null). */
  name: string | null;
  categorySlug: string | null;
}

export interface GeoSearchResult {
  name: string;
  lat: number;
  lng: number;
  address: string | null;
}

/**
 * Read-side geocoding for the lead map picker. The concrete implementation
 * (OSM Overpass + Nominatim) is swappable via env without touching callers.
 */
export interface IGeocoder {
  /** Shop/amenity POIs with a name inside the bbox. */
  searchPois(bbox: GeoBBox): Promise<OsmPoi[]>;
  /** Address (+ POI name/category if the point is a known place) for a coordinate. */
  reverse(lat: number, lng: number): Promise<ReverseResult>;
  /** Forward place search (Thailand) to recenter the map. */
  search(query: string): Promise<GeoSearchResult[]>;
}
