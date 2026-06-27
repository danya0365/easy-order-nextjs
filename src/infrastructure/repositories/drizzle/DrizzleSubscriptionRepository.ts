import "server-only";

import { eq } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { Subscription, SubscriptionStatus } from "@/src/domain/entities";
import type {
  AdvancePeriodInput,
  CreateSubscriptionInput,
  ISubscriptionRepository,
} from "@/src/application/repositories/ISubscriptionRepository";

type Row = typeof schema.subscriptions.$inferSelect;

function toSub(r: Row): Subscription {
  return {
    id: r.id,
    shopId: r.shopId,
    status: r.status,
    pricePerDaySatang: r.pricePerDaySatang,
    amountSatang: r.amountSatang,
    currentPeriodStartAt: r.currentPeriodStartAt,
    currentPeriodDueAt: r.currentPeriodDueAt,
    pausedAt: r.pausedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleSubscriptionRepository implements ISubscriptionRepository {
  async create(input: CreateSubscriptionInput): Promise<Subscription> {
    const [r] = await db
      .insert(schema.subscriptions)
      .values({
        shopId: input.shopId,
        pricePerDaySatang: input.pricePerDaySatang,
        status: input.status ?? "trialing",
        currentPeriodStartAt: input.currentPeriodStartAt,
        currentPeriodDueAt: input.currentPeriodDueAt,
      })
      .returning();
    return toSub(r);
  }

  async findByShop(shopId: string): Promise<Subscription | null> {
    const r = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.shopId, shopId),
    });
    return r ? toSub(r) : null;
  }

  async findById(id: string): Promise<Subscription | null> {
    const r = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.id, id),
    });
    return r ? toSub(r) : null;
  }

  async advancePeriod(
    id: string,
    input: AdvancePeriodInput,
  ): Promise<Subscription> {
    const [r] = await db
      .update(schema.subscriptions)
      .set({
        currentPeriodStartAt: input.currentPeriodStartAt,
        currentPeriodDueAt: input.currentPeriodDueAt,
        status: input.status,
      })
      .where(eq(schema.subscriptions.id, id))
      .returning();
    return toSub(r);
  }

  async setStatus(
    id: string,
    status: SubscriptionStatus,
  ): Promise<Subscription> {
    const [r] = await db
      .update(schema.subscriptions)
      .set({ status })
      .where(eq(schema.subscriptions.id, id))
      .returning();
    return toSub(r);
  }

  async pause(id: string, pausedAt: string): Promise<Subscription> {
    const [r] = await db
      .update(schema.subscriptions)
      .set({ pausedAt })
      .where(eq(schema.subscriptions.id, id))
      .returning();
    return toSub(r);
  }

  async resume(id: string, currentPeriodDueAt: string): Promise<Subscription> {
    const [r] = await db
      .update(schema.subscriptions)
      .set({ currentPeriodDueAt, pausedAt: null })
      .where(eq(schema.subscriptions.id, id))
      .returning();
    return toSub(r);
  }
}
