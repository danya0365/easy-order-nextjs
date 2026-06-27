import "server-only";

import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { ShopCategory } from "@/src/domain/entities";
import type { IShopCategoryRepository } from "@/src/application/repositories/IShopCategoryRepository";

type Row = typeof schema.shopCategories.$inferSelect;

function toCategory(r: Row): ShopCategory {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    sortOrder: r.sortOrder,
    isActive: r.isActive,
    createdAt: r.createdAt,
  };
}

export class DrizzleShopCategoryRepository implements IShopCategoryRepository {
  async listActive(): Promise<ShopCategory[]> {
    const rows = await db.query.shopCategories.findMany({
      where: eq(schema.shopCategories.isActive, true),
      orderBy: asc(schema.shopCategories.sortOrder),
    });
    return rows.map(toCategory);
  }

  async findById(id: string): Promise<ShopCategory | null> {
    const r = await db.query.shopCategories.findFirst({
      where: eq(schema.shopCategories.id, id),
    });
    return r ? toCategory(r) : null;
  }
}
