import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { ShopImage } from "@/src/domain/entities";
import type {
  CreateShopImageInput,
  IShopImageRepository,
} from "@/src/application/repositories/IShopImageRepository";

type Row = typeof schema.shopImages.$inferSelect;

function toImage(r: Row): ShopImage {
  return {
    id: r.id,
    shopId: r.shopId,
    kind: r.kind,
    storageKey: r.storageKey,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
  };
}

export class DrizzleShopImageRepository implements IShopImageRepository {
  async create(input: CreateShopImageInput): Promise<ShopImage> {
    const [r] = await db
      .insert(schema.shopImages)
      .values({
        id: input.id,
        shopId: input.shopId,
        kind: input.kind,
        storageKey: input.storageKey,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();
    return toImage(r);
  }

  async listByShop(shopId: string): Promise<ShopImage[]> {
    const rows = await db.query.shopImages.findMany({
      where: eq(schema.shopImages.shopId, shopId),
      orderBy: [
        asc(schema.shopImages.sortOrder),
        asc(schema.shopImages.createdAt),
      ],
    });
    return rows.map(toImage);
  }

  async findById(id: string): Promise<ShopImage | null> {
    const r = await db.query.shopImages.findFirst({
      where: eq(schema.shopImages.id, id),
    });
    return r ? toImage(r) : null;
  }

  async findProfile(shopId: string): Promise<ShopImage | null> {
    const r = await db.query.shopImages.findFirst({
      where: and(
        eq(schema.shopImages.shopId, shopId),
        eq(schema.shopImages.kind, "profile"),
      ),
    });
    return r ? toImage(r) : null;
  }

  async profilesByShop(shopIds: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    if (shopIds.length === 0) return result;
    const rows = await db
      .select({
        shopId: schema.shopImages.shopId,
        id: schema.shopImages.id,
      })
      .from(schema.shopImages)
      .where(
        and(
          inArray(schema.shopImages.shopId, shopIds),
          eq(schema.shopImages.kind, "profile"),
        ),
      );
    for (const r of rows) result[r.shopId] = r.id;
    return result;
  }

  async delete(id: string): Promise<void> {
    await db.delete(schema.shopImages).where(eq(schema.shopImages.id, id));
  }

  async allStorageKeys(): Promise<string[]> {
    const rows = await db
      .select({ key: schema.shopImages.storageKey })
      .from(schema.shopImages);
    return rows.map((r) => r.key).filter(Boolean);
  }
}
