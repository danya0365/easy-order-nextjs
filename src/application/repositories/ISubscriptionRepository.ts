import type { Subscription, SubscriptionStatus } from "@/src/domain/entities";

export interface CreateSubscriptionInput {
  shopId: string;
  pricePerDaySatang: number;
  status?: SubscriptionStatus;
  currentPeriodStartAt: string;
  currentPeriodDueAt: string;
}

export interface AdvancePeriodInput {
  currentPeriodStartAt: string;
  currentPeriodDueAt: string;
  status: SubscriptionStatus;
}

export interface ISubscriptionRepository {
  create(input: CreateSubscriptionInput): Promise<Subscription>;
  findByShop(shopId: string): Promise<Subscription | null>;
  findById(id: string): Promise<Subscription | null>;
  advancePeriod(id: string, input: AdvancePeriodInput): Promise<Subscription>;
  setStatus(id: string, status: SubscriptionStatus): Promise<Subscription>;
  /** Temporarily pause (freeze billing): record when it started. */
  pause(id: string, pausedAt: string): Promise<Subscription>;
  /** Resume: clear pausedAt and push the due date forward by the paused span. */
  resume(id: string, currentPeriodDueAt: string): Promise<Subscription>;
}
