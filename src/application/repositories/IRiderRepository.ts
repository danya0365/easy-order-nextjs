import type {
  Rider,
  RiderAccount,
  RiderCommissionType,
  RiderMembershipStatus,
  RiderPayoutRow,
  RiderShopMembership,
} from "@/src/domain/entities";

export interface RiderInput {
  name: string;
  phone: string;
  commissionType: RiderCommissionType;
  commissionValue: number;
  lineId?: string | null;
}

export interface NewRiderAccountInput {
  name: string;
  phone: string;
  /** Canonical phone for "add by phone" (unique); null = not claimable by phone. */
  phoneKey: string | null;
}

export interface IRiderRepository {
  // --- per-shop membership (shop side; always scoped by shopId) ---
  create(
    shopId: string,
    input: RiderInput & { accountId: string; status: RiderMembershipStatus },
  ): Promise<Rider>;
  update(shopId: string, id: string, input: Partial<RiderInput> & { active?: boolean }): Promise<Rider>;
  findById(shopId: string, id: string): Promise<Rider | null>;
  listByShop(shopId: string): Promise<Rider[]>;
  /** One page of the shop's riders (oldest first) + total count. */
  listByShopPaged(shopId: string, offset: number, limit: number): Promise<{ items: Rider[]; total: number }>;
  /** This shop's memberships with the same phone (duplicate warning). */
  findByShopAndPhone(shopId: string, phone: string): Promise<Rider[]>;
  /** This shop's membership of an account, if any. */
  findByShopAndAccount(shopId: string, accountId: string): Promise<Rider | null>;
  /** Resolve an ACTIVE membership by personal-link token hash (any shop). */
  findActiveByTokenHash(hash: string): Promise<Rider | null>;
  /** Replace (or clear with null) the personal-link token hash. */
  setTokenHash(shopId: string, id: string, hash: string | null): Promise<void>;
  /** Avatar key by membership id (any shop; account photo first) — for the public avatar route. */
  findAvatarKey(id: string): Promise<string | null>;
  setAvailable(shopId: string, id: string, available: boolean): Promise<Rider>;
  /** Delivered trips per rider within [fromISO, toISO). */
  payoutSummary(shopId: string, fromISO: string, toISO: string): Promise<RiderPayoutRow[]>;

  // --- global account (rider side) ---
  createAccount(input: NewRiderAccountInput): Promise<RiderAccount>;
  findAccountById(id: string): Promise<RiderAccount | null>;
  findAccountByPhoneKey(phoneKey: string): Promise<RiderAccount | null>;
  /** Every membership of the account with its shop (rider's own view). */
  listMembershipsByAccount(accountId: string): Promise<RiderShopMembership[]>;
  /** Approve an invited membership. */
  approveMembership(id: string): Promise<void>;
  /** Move a membership to another account (rider confirmed "add shop to my account") and approve it. */
  moveMembership(id: string, toAccountId: string): Promise<void>;
  /** Mark an emptied account merged into another; hands over its phoneKey when the target has none. */
  markAccountMerged(fromId: string, intoId: string): Promise<void>;
  /** Global availability: account + all of its memberships. */
  setAccountAvailable(accountId: string, available: boolean): Promise<void>;
  /** Set the account photo; returns the previous key. */
  setAccountAvatar(accountId: string, key: string | null): Promise<string | null>;
}
