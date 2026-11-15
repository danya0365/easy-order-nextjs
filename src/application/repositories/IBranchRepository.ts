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
  /** Shop category name (for the popup), or null when uncategorised. */
  categoryName: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
}

export interface IBranchRepository {
  create(input: CreateBranchInput): Promise<Branch>;
  findById(id: string): Promise<Branch | null>;
  listByShop(shopId: string): Promise<Branch[]>;
  setActive(id: string, isActive: boolean): Promise<Branch>;
  /** Temporary open/closed-for-orders switch. */
  setAcceptingOrders(id: string, acceptingOrders: boolean): Promise<Branch>;
  /** Offset page of a shop's branches (oldest first) + total, for the back-office list. */
  pageByShop(
    shopId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: Branch[]; total: number }>;
  /** Menu item ids marked sold out at this branch (per-branch override). */
  listSoldOutItemIds(branchId: string): Promise<string[]>;
  /** Mark/unmark a shared menu item sold out at one branch. */
  setItemSoldOut(branchId: string, menuItemId: string, soldOut: boolean): Promise<void>;
  updateLocation(id: string, input: UpdateBranchLocationInput): Promise<Branch>;
  /** Active branches with coordinates belonging to active shops — for the public map. */
  listMapLocations(): Promise<ShopMapLocation[]>;
}
