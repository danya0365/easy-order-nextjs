import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { MenuCategory } from "@/src/domain/entities";
import type {
  CreateMenuCategoryInput,
  IMenuCategoryRepository,
  UpdateMenuCategoryInput,
} from "@/src/application/repositories/IMenuCategoryRepository";

type Row = typeof schema.menuCategories.$inferSelect;

function toCategory(r: Row): MenuCategory {
  return {
    id: r.id,
    shopId: r.shopId,
    name: r.name,
    sortOrder: r.sortOrder,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleMenuCategoryRepository implements IMenuCategoryRepository {
  async create(input: CreateMenuCategoryInput): Promise<MenuCategory> {
    const [r] = await db
      .insert(schema.menuCategories)
      .values({
        shopId: input.shopId,
        name: input.name,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();
    return toCategory(r);
  }

  async findById(id: string): Promise<MenuCategory | null> {
    const r = await db.query.menuCategories.findFirst({
      where: eq(schema.menuCategories.id, id),
    });
    return r ? toCategory(r) : null;
  }

  async listByShop(shopId: string): Promise<MenuCategory[]> {
    const rows = await db.query.menuCategories.findMany({
      where: eq(schema.menuCategories.shopId, shopId),
      orderBy: [
        asc(schema.menuCategories.sortOrder),
        asc(schema.menuCategories.createdAt),
      ],
    });
    return rows.map(toCategory);
  }

  async listActiveByShop(shopId: string): Promise<MenuCategory[]> {
    const rows = await db.query.menuCategories.findMany({
      where: and(
        eq(schema.menuCategories.shopId, shopId),
        eq(schema.menuCategories.isActive, true),
      ),
      orderBy: [
        asc(schema.menuCategories.sortOrder),
        asc(schema.menuCategories.createdAt),
      ],
    });
    return rows.map(toCategory);
  }

  async update(
    id: string,
    input: UpdateMenuCategoryInput,
  ): Promise<MenuCategory> {
    const [r] = await db
      .update(schema.menuCategories)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.sortOrder !== undefined
          ? { sortOrder: input.sortOrder }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      })
      .where(eq(schema.menuCategories.id, id))
      .returning();
    return toCategory(r);
  }

  async delete(id: string): Promise<void> {
    await db
      .delete(schema.menuCategories)
      .where(eq(schema.menuCategories.id, id));
  }
}
