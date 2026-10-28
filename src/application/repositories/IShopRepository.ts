import type { Shop, ShopStatus } from "@/src/domain/entities";

export interface CreateShopInput {
  name: string;
  slug: string;
  categoryId?: string | null;
  logoUrl?: string | null;
  promptpayTarget?: string | null;
}

export interface UpdateShopSettingsInput {
  name?: string;
  categoryId?: string | null;
  logoUrl?: string | null;
  promptpayTarget?: string | null;
  /** Bcrypt hash of the kiosk PIN; pass null to clear it. */
  kioskPinHash?: string | null;
  /** Online-order settings (toggles + delivery charge/notes/minimum). */
  onlineOrderingEnabled?: boolean;
  pickupEnabled?: boolean;
  deliveryEnabled?: boolean;
  deliveryFeeSatang?: number;
  deliveryNotes?: string | null;
  minOrderSatang?: number | null;
  loyaltyEnabled?: boolean;
  stampCardEnabled?: boolean;
  spendPointsEnabled?: boolean;
  /** Promotions module (mirrors loyalty gates). */
  promotionsEnabled?: boolean;
}

export interface IShopRepository {
  create(input: CreateShopInput): Promise<Shop>;
  findById(id: string): Promise<Shop | null>;
  findBySlug(slug: string): Promise<Shop | null>;
  list(): Promise<Shop[]>;
  updateSettings(id: string, input: UpdateShopSettingsInput): Promise<Shop>;
  setStatus(id: string, status: ShopStatus): Promise<Shop>;
  /** Toggle self-service mode (customers self-pay + self-complete on the kiosk). */
  setSelfService(id: string, on: boolean): Promise<Shop>;
  /** Platform admin allow/deny the loyalty module for a shop. */
  setLoyaltyAllowedByAdmin(id: string, on: boolean): Promise<Shop>;
  /** Platform admin allow/deny the promotions module for a shop. */
  setPromotionsAllowedByAdmin(id: string, on: boolean): Promise<Shop>;
  /** Returns the stored kiosk PIN hash (or null) — infra-only, for verification. */
  getKioskPinHash(id: string): Promise<string | null>;
}
