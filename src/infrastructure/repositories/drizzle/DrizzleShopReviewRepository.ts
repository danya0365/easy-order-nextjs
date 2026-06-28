import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { ReviewSummary, ShopReview } from "@/src/domain/entities";
import type {
  IShopReviewRepository,
  ListReviewsOpts,
  UpsertReviewInput,
} from "@/src/application/repositories/IShopReviewRepository";
import type { Page, PageOpts } from "@/src/application/repositories/pagination";
import { decodeCursor } from "@/src/application/repositories/pagination";
import { cursorWhere, toPage } from "./_cursor";

type Row = typeof schema.shopReviews.$inferSelect;

function toReview(r: Row): ShopReview {
  return {
    id: r.id,
    shopId: r.shopId,
    customerId: r.customerId,
    rating: r.rating,
    comment: r.comment,
    ownerReply: r.ownerReply,
    ownerRepliedAt: r.ownerRepliedAt,
    isHidden: r.isHidden,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleShopReviewRepository implements IShopReviewRepository {
  async upsert(input: UpsertReviewInput): Promise<ShopReview> {
    const now = new Date().toISOString();
    const [r] = await db
      .insert(schema.shopReviews)
      .values({
        shopId: input.shopId,
        customerId: input.customerId,
        rating: input.rating,
        comment: input.comment,
      })
      .onConflictDoUpdate({
        target: [schema.shopReviews.shopId, schema.shopReviews.customerId],
        set: {
          rating: input.rating,
          comment: input.comment,
          updatedAt: now,
        },
      })
      .returning();
    return toReview(r);
  }

  async findById(id: string): Promise<ShopReview | null> {
    const r = await db.query.shopReviews.findFirst({
      where: eq(schema.shopReviews.id, id),
    });
    return r ? toReview(r) : null;
  }

  async findByCustomer(
    shopId: string,
    customerId: string,
  ): Promise<ShopReview | null> {
    const r = await db.query.shopReviews.findFirst({
      where: and(
        eq(schema.shopReviews.shopId, shopId),
        eq(schema.shopReviews.customerId, customerId),
      ),
    });
    return r ? toReview(r) : null;
  }

  async pageByShop(
    shopId: string,
    opts: ListReviewsOpts = {},
  ): Promise<Page<ShopReview>> {
    const limit = opts.limit ?? 20;
    const cur = decodeCursor(opts.cursor);
    const rows = await db.query.shopReviews.findMany({
      where: and(
        eq(schema.shopReviews.shopId, shopId),
        opts.includeHidden ? undefined : eq(schema.shopReviews.isHidden, false),
        cursorWhere(
          schema.shopReviews.createdAt,
          schema.shopReviews.id,
          cur,
        ),
      ),
      orderBy: [
        desc(schema.shopReviews.createdAt),
        desc(schema.shopReviews.id),
      ],
      limit: limit + 1,
    });
    return toPage(rows.map(toReview), limit);
  }

  async pageAll(opts: PageOpts = {}): Promise<Page<ShopReview>> {
    const limit = opts.limit ?? 20;
    const cur = decodeCursor(opts.cursor);
    const rows = await db.query.shopReviews.findMany({
      where: cursorWhere(
        schema.shopReviews.createdAt,
        schema.shopReviews.id,
        cur,
      ),
      orderBy: [
        desc(schema.shopReviews.createdAt),
        desc(schema.shopReviews.id),
      ],
      limit: limit + 1,
    });
    return toPage(rows.map(toReview), limit);
  }

  async setReply(id: string, reply: string): Promise<ShopReview> {
    const [r] = await db
      .update(schema.shopReviews)
      .set({ ownerReply: reply, ownerRepliedAt: new Date().toISOString() })
      .where(eq(schema.shopReviews.id, id))
      .returning();
    return toReview(r);
  }

  async setHidden(id: string, hidden: boolean): Promise<ShopReview> {
    const [r] = await db
      .update(schema.shopReviews)
      .set({ isHidden: hidden })
      .where(eq(schema.shopReviews.id, id))
      .returning();
    return toReview(r);
  }

  async summary(shopId: string): Promise<ReviewSummary> {
    const [row] = await db
      .select({
        avg: sql<number>`avg(${schema.shopReviews.rating})`,
        count: sql<number>`count(*)`,
      })
      .from(schema.shopReviews)
      .where(
        and(
          eq(schema.shopReviews.shopId, shopId),
          eq(schema.shopReviews.isHidden, false),
        ),
      );
    const count = Number(row?.count ?? 0);
    const average = count > 0 ? Number(row?.avg ?? 0) : 0;
    return { average, count };
  }

  async summariesByShop(
    shopIds: string[],
  ): Promise<Record<string, ReviewSummary>> {
    const result: Record<string, ReviewSummary> = {};
    if (shopIds.length === 0) return result;
    const rows = await db
      .select({
        shopId: schema.shopReviews.shopId,
        avg: sql<number>`avg(${schema.shopReviews.rating})`,
        count: sql<number>`count(*)`,
      })
      .from(schema.shopReviews)
      .where(
        and(
          inArray(schema.shopReviews.shopId, shopIds),
          eq(schema.shopReviews.isHidden, false),
        ),
      )
      .groupBy(schema.shopReviews.shopId);
    for (const r of rows) {
      const count = Number(r.count ?? 0);
      result[r.shopId] = {
        average: count > 0 ? Number(r.avg ?? 0) : 0,
        count,
      };
    }
    return result;
  }
}
