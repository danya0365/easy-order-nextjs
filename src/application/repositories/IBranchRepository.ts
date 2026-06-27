import type { Branch } from "@/src/domain/entities";

export interface CreateBranchInput {
  shopId: string;
  name: string;
}

export interface UpdateBranchLocationInput {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

/**
 * Public read-model: an active branch that has coordinates, joined with its
 * (active) shop — everything the homepage map needs to plot a pin.
 */
export interface ShopMapLocation {
  branchId: string;
  branchName: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  latitude: number;
  longitude: number;
  address: string | null;
}

export interface IBranchRepository {
  create(input: CreateBranchInput): Promise<Branch>;
  findById(id: string): Promise<Branch | null>;
  listByShop(shopId: string): Promise<Branch[]>;
  setActive(id: string, isActive: boolean): Promise<Branch>;
  updateLocation(id: string, input: UpdateBranchLocationInput): Promise<Branch>;
  /** Active branches with coordinates belonging to active shops — for the public map. */
  listMapLocations(): Promise<ShopMapLocation[]>;
}
