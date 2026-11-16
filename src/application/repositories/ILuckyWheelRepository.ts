import type {
  SpinCampaign,
  SpinPrize,
  SpinPrizeType,
  SpinResult,
  SpinRewardStatus,
  SpinTicket,
  SpinTicketSource,
} from "@/src/domain/entities";

export interface UpdateSpinCampaignInput {
  name?: string;
  isActive?: boolean;
  minOrderSatang?: number;
  ticketsPerOrder?: number;
  monthlyFreeEnabled?: boolean;
  monthlyWindowDays?: number;
  rewardExpiryDays?: number;
  rulesText?: string | null;
}

export interface SpinPrizeInput {
  type: SpinPrizeType;
  name: string;
  weight: number;
  stock: number | null;
  dailyCap: number | null;
  pointsAmount: number | null;
  menuItemId: string | null;
  costSatang: number;
  isActive: boolean;
  sortOrder: number;
}

export interface GrantTicketInput {
  shopId: string;
  customerId: string;
  source: SpinTicketSource;
  sourceKey: string;
  orderId?: string | null;
  expiresAt?: string | null;
}

export interface CreateSpinResultInput {
  shopId: string;
  customerId: string;
  ticketId: string;
  prizeId: string | null;
  prizeType: SpinPrizeType;
  prizeName: string;
  pointsAwarded: number;
  costSatang: number;
  dayKey: string;
  rewardCode: string | null;
  rewardStatus: SpinRewardStatus;
  expiresAt: string | null;
}

export interface SpinResultFilter {
  customerId?: string;
  /** Only results with a redeemable reward (pending or redeemed). */
  rewardsOnly?: boolean;
  rewardStatus?: SpinRewardStatus;
}

export interface SpinReport {
  spins: number;
  ticketsIssued: number;
  ticketsAvailable: number;
  ticketsRevoked: number;
  pointsAwarded: number;
  costSatang: number;
  rewardsPending: number;
  rewardsRedeemed: number;
  byPrize: { prizeName: string; prizeType: SpinPrizeType; wins: number; costSatang: number; redeemed: number }[];
}

export interface ILuckyWheelRepository {
  getCampaign(shopId: string): Promise<SpinCampaign | null>;
  /** Create on first use, then patch. */
  upsertCampaign(shopId: string, input: UpdateSpinCampaignInput): Promise<SpinCampaign>;

  listPrizes(shopId: string): Promise<SpinPrize[]>;
  findPrize(shopId: string, id: string): Promise<SpinPrize | null>;
  createPrize(shopId: string, campaignId: string, input: SpinPrizeInput): Promise<SpinPrize>;
  updatePrize(shopId: string, id: string, input: SpinPrizeInput): Promise<SpinPrize>;
  /** Hard-delete a never-won prize; otherwise deactivate (keeps history). */
  deletePrize(shopId: string, id: string): Promise<"deleted" | "deactivated">;
  /** Atomically take one unit of stock (true when unlimited or a unit was taken). */
  takeStock(prizeId: string): Promise<boolean>;
  winsOnDay(shopId: string, dayKey: string): Promise<Record<string, number>>;

  /** Idempotent: returns null when `sourceKey` was already granted. */
  grantTicket(input: GrantTicketInput): Promise<SpinTicket | null>;
  availableTickets(shopId: string, customerId: string, nowISO: string): Promise<SpinTicket[]>;
  /** available → used, exactly once (false if it was already used/revoked). */
  useTicket(ticketId: string, nowISO: string): Promise<boolean>;
  /** Revoke unused tickets of an order (cancelled). Returns how many. */
  revokeOrderTickets(shopId: string, orderId: string): Promise<number>;
  ticketsByOrder(shopId: string, orderId: string): Promise<SpinTicket[]>;

  createResult(input: CreateSpinResultInput): Promise<SpinResult>;
  findResult(shopId: string, id: string): Promise<SpinResult | null>;
  findResultByCode(shopId: string, code: string): Promise<SpinResult | null>;
  pageResults(
    shopId: string,
    filter: SpinResultFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: SpinResult[]; total: number }>;
  /** pending → redeemed exactly once. */
  markRedeemed(shopId: string, id: string, by: string, branchId: string | null, nowISO: string): Promise<boolean>;
  report(shopId: string, sinceISO: string | null): Promise<SpinReport>;
}
