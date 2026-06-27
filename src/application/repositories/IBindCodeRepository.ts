export interface CreateBindCodeInput {
  shopId: string;
  customerId: string;
  expiresAt: string;
}

export interface IBindCodeRepository {
  create(input: CreateBindCodeInput): Promise<{ code: string }>;
  /** Return the binding if the code exists, is unused, and not expired. */
  findValid(
    code: string,
    now: Date,
  ): Promise<{ shopId: string; customerId: string } | null>;
  markUsed(code: string, at: string): Promise<void>;
  /** Count codes created for a customer at/after `since` (for rate-limiting). */
  countRecentByCustomer(customerId: string, since: Date): Promise<number>;
}
