import type { Rider, RiderCommissionType, RiderPayoutRow } from "@/src/domain/entities";

export interface RiderInput {
  name: string;
  phone: string;
  commissionType: RiderCommissionType;
  commissionValue: number;
  lineId?: string | null;
}

export interface IRiderRepository {
  create(shopId: string, input: RiderInput): Promise<Rider>;
  update(shopId: string, id: string, input: Partial<RiderInput> & { active?: boolean }): Promise<Rider>;
  findById(shopId: string, id: string): Promise<Rider | null>;
  listByShop(shopId: string): Promise<Rider[]>;
  /** Resolve an ACTIVE rider by token hash (any shop) — for the rider page. */
  findActiveByTokenHash(hash: string): Promise<Rider | null>;
  /** Replace (or clear with null) the personal-link token hash. */
  setTokenHash(shopId: string, id: string, hash: string | null): Promise<void>;
  /** Set/clear the profile photo storage key. Returns the previous key. */
  setAvatar(shopId: string, id: string, key: string | null): Promise<string | null>;
  /** Avatar key by rider id (any shop) — for the public avatar route. */
  findAvatarKey(id: string): Promise<string | null>;
  setAvailable(shopId: string, id: string, available: boolean): Promise<Rider>;
  /** Delivered trips per rider within [fromISO, toISO). */
  payoutSummary(shopId: string, fromISO: string, toISO: string): Promise<RiderPayoutRow[]>;
}
