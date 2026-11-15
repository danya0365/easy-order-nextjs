import "server-only";

import { and, asc, count, eq, isNotNull, isNull } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { Branch } from "@/src/domain/entities";
import type {
  CreateBranchInput,
  IBranchRepository,
  ShopMapLocation,
  UpdateBranchLocationInput,
} from "@/src/application/repositories/IBranchRepository";

type Row = typeof schema.branches.$inferSelect;

function toBranch(r: Row): Branch {
  return {
    id: r.id,
    shopId: r.shopId,
    name: r.name,
    isActive: r.isActive,
    acceptingOrders: r.acceptingOrders ?? true,
    latitude: r.latitude,
    longitude: r.longitude,
    address: r.address,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleBranchRepository implements IBranchRepository {
  async create(input: CreateBranchInput): Promise<Branch> {
    const [r] = await db
      .insert(schema.branches)
      .values({ shopId: input.shopId, name: input.name })
      .returning();
    return toBranch(r);
  }

  async findById(id: string): Promise<Branch | null> {
    const r = await db.query.branches.findFirst({
      where: eq(schema.branches.id, id),
    });
    return r ? toBranch(r) : null;
  }

  async listByShop(shopId: string): Promise<Branch[]> {
    const rows = await db.query.branches.findMany({
      where: eq(schema.branches.shopId, shopId),
      // Oldest first (id tie-break): rows[0] is the shop's main branch.
      orderBy: [asc(schema.branches.createdAt), asc(schema.branches.id)],
    });
    return rows.map(toBranch);
  }

  async setActive(id: string, isActive: boolean): Promise<Branch> {
    const [r] = await db
      .update(schema.branches)
      .set({ isActive })
      .where(eq(schema.branches.id, id))
      .returning();
    return toBranch(r);
  }

  async setAcceptingOrders(id: string, acceptingOrders: boolean): Promise<Branch> {
    const [r] = await db
      .update(schema.branches)
      .set({ acceptingOrders })
      .where(eq(schema.branches.id, id))
      .returning();
    return toBranch(r);
  }

  async pageByShop(
    shopId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: Branch[]; total: number }> {
    const [c] = await db
      .select({ n: count() })
      .from(schema.branches)
      .where(eq(schema.branches.shopId, shopId));
    const rows = await db.query.branches.findMany({
      where: eq(schema.branches.shopId, shopId),
      orderBy: [asc(schema.branches.createdAt), asc(schema.branches.id)],
      limit: pageSize,
      offset: Math.max(0, (page - 1) * pageSize),
    });
    return { items: rows.map(toBranch), total: Number(c?.n ?? 0) };
  }

  async listSoldOutItemIds(branchId: string): Promise<string[]> {
    const rows = await db
      .select({ id: schema.branchMenuOverrides.menuItemId })
      .from(schema.branchMenuOverrides)
      .where(
        and(
          eq(schema.branchMenuOverrides.branchId, branchId),
          eq(schema.branchMenuOverrides.soldOut, true),
        ),
      );
    return rows.map((r) => r.id);
  }

  async setItemSoldOut(
    branchId: string,
    menuItemId: string,
    soldOut: boolean,
  ): Promise<void> {
    if (!soldOut) {
      await db
        .delete(schema.branchMenuOverrides)
        .where(
          and(
            eq(schema.branchMenuOverrides.branchId, branchId),
            eq(schema.branchMenuOverrides.menuItemId, menuItemId),
          ),
        );
      return;
    }
    await db
      .insert(schema.branchMenuOverrides)
      .values({ branchId, menuItemId, soldOut: true })
      .onConflictDoUpdate({
        target: [
          schema.branchMenuOverrides.branchId,
          schema.branchMenuOverrides.menuItemId,
        ],
        set: { soldOut: true, updatedAt: new Date().toISOString() },
      });
  }

  async updateLocation(
    id: string,
    input: UpdateBranchLocationInput,
  ): Promise<Branch> {
    const [r] = await db
      .update(schema.branches)
      .set({
        latitude: input.latitude,
        longitude: input.longitude,
        address: input.address,
      })
      .where(eq(schema.branches.id, id))
      .returning();
    return toBranch(r);
  }

  async listMapLocations(): Promise<ShopMapLocation[]> {
    const rows = await db
      .select({
        branchId: schema.branches.id,
        branchName: schema.branches.name,
        shopId: schema.shops.id,
        shopName: schema.shops.name,
        shopSlug: schema.shops.slug,
        categoryName: schema.shopCategories.name,
        latitude: schema.branches.latitude,
        longitude: schema.branches.longitude,
        address: schema.branches.address,
      })
      .from(schema.branches)
      .innerJoin(schema.shops, eq(schema.branches.shopId, schema.shops.id))
      .leftJoin(
        schema.shopCategories,
        eq(schema.shops.categoryId, schema.shopCategories.id),
      )
      // Hide temporarily-paused shops from the public map.
      .leftJoin(
        schema.subscriptions,
        eq(schema.subscriptions.shopId, schema.shops.id),
      )
      .where(
        and(
          eq(schema.branches.isActive, true),
          eq(schema.shops.status, "active"),
          isNull(schema.subscriptions.pausedAt),
          isNotNull(schema.branches.latitude),
          isNotNull(schema.branches.longitude),
        ),
      )
      .orderBy(asc(schema.shops.name));

    // latitude/longitude are guaranteed non-null by the isNotNull filters above.
    return rows.map((r) => ({
      ...r,
      latitude: r.latitude as number,
      longitude: r.longitude as number,
    }));
  }
}
