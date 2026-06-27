import type { Shop, ShopStatus } from "@/src/domain/entities";

export interface CreateShopInput {
  name: string;
  slug: string;
  logoUrl?: string | null;
  promptpayTarget?: string | null;
}

export interface UpdateShopSettingsInput {
  name?: string;
  logoUrl?: string | null;
  promptpayTarget?: string | null;
  /** Bcrypt hash of the kiosk PIN; pass null to clear it. */
  kioskPinHash?: string | null;
}

export interface IShopRepository {
  create(input: CreateShopInput): Promise<Shop>;
  findById(id: string): Promise<Shop | null>;
  findBySlug(slug: string): Promise<Shop | null>;
  list(): Promise<Shop[]>;
  updateSettings(id: string, input: UpdateShopSettingsInput): Promise<Shop>;
  setStatus(id: string, status: ShopStatus): Promise<Shop>;
  /** Returns the stored kiosk PIN hash (or null) — infra-only, for verification. */
  getKioskPinHash(id: string): Promise<string | null>;
}
