export interface SignupAttemptInput {
  shopId: string;
  customerId: string | null;
  ipHash: string | null;
  deviceId: string | null;
  phone: string;
}

export interface SignupAttempt extends SignupAttemptInput {
  id: string;
  createdAt: string;
}

/** Anti-spam ledger + shop-level phone blocklist for static-QR membership. */
export interface IMemberSignupGuardRepository {
  recordAttempt(input: SignupAttemptInput): Promise<void>;
  /** Signups at the shop since `sinceIso` matching ip_hash OR device id. */
  countRecentBySource(
    shopId: string,
    ipHash: string | null,
    deviceId: string | null,
    sinceIso: string,
  ): Promise<number>;
  /** All attempts at the shop since `sinceIso` (for queue signals). */
  listSince(shopId: string, sinceIso: string): Promise<SignupAttempt[]>;
  /** Latest attempt per customer id (for queue signals). */
  listByCustomers(shopId: string, customerIds: string[]): Promise<SignupAttempt[]>;
  isPhoneBlocked(shopId: string, phone: string): Promise<boolean>;
  blockPhone(shopId: string, phone: string, createdBy: string): Promise<void>;
  unblockPhone(shopId: string, phone: string): Promise<void>;
}
