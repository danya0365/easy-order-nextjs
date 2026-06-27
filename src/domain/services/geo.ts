export interface LatLngInput {
  latitude: number | null;
  longitude: number | null;
}

/**
 * Validate an optional lat/lng pair: both-or-neither, and within valid ranges.
 * Throws a Thai-language Error on invalid input. Shared by the branch and lead
 * location editors so the rules stay in one place.
 */
export function validateLatLng({ latitude, longitude }: LatLngInput): void {
  const hasLat = latitude !== null;
  const hasLng = longitude !== null;
  if (hasLat !== hasLng) {
    throw new Error("ต้องระบุทั้งละติจูดและลองจิจูด");
  }
  if (hasLat && (latitude! < -90 || latitude! > 90)) {
    throw new Error("ละติจูดต้องอยู่ระหว่าง -90 ถึง 90");
  }
  if (hasLng && (longitude! < -180 || longitude! > 180)) {
    throw new Error("ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180");
  }
}

/**
 * Normalize and validate an optional address string (≤200 chars). Returns the
 * trimmed value, or null when empty.
 */
export function normalizeAddress(raw: string | null | undefined): string | null {
  const address = raw?.trim() || null;
  if (address && address.length > 200) {
    throw new Error("ที่อยู่ต้องไม่เกิน 200 ตัวอักษร");
  }
  return address;
}
