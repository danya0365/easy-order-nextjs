import "server-only";

import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { MenuItem } from "@/src/domain/entities";
import type {
  CreateMenuItemInput,
  IMenuItemRepository,
  UpdateMenuItemInput,
} from "@/src/application/repositories/IMenuItemRepository";

type Row = typeof schema.menuItems.$inferSelect;

function toItem(r: Row): MenuItem {
  return {
    id: r.id,
    shopId: r.shopId,
    categoryId: r.categoryId,
    name: r.name,
    description: r.description,
    priceSatang: r.priceSatang,
    imageUrl: r.imageUrl,
    isAvailable: r.isAvailable,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleMenuItemRepository implements IMenuItemRepository {
  async create(input: CreateMenuItemInput): Promise<MenuItem> {
    const [r] = await db
      .insert(schema.menuItems)
      .values({
        shopId: input.shopId,
        categoryId: input.categoryId,
        name: input.name,
        description: input.description ?? null,
        priceSatang: input.priceSatang,
        imageUrl: input.imageUrl ?? null,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();
    return toItem(r);
  }

  async findById(id: string): Promise<MenuItem | null> {
    const r = await db.query.menuItems.findFirst({
      where: eq(schema.menuItems.id, id),
    });
    return r ? toItem(r) : null;
  }

  async listByShop(shopId: string): Promise<MenuItem[]> {
    const rows = await db.query.menuItems.findMany({
      where: eq(schema.menuItems.shopId, shopId),
      orderBy: [
        asc(schema.menuItems.sortOrder),
        asc(schema.menuItems.createdAt),
      ],
    });
    return rows.map(toItem);
  }

  async listAvailableByShop(shopId: string): Promise<MenuItem[]> {
    const rows = await db.query.menuItems.findMany({
      where: and(
        eq(schema.menuItems.shopId, shopId),
        eq(schema.menuItems.isAvailable, true),
      ),
      orderBy: [
        asc(schema.menuItems.sortOrder),
        asc(schema.menuItems.createdAt),
      ],
    });
    return rows.map(toItem);
  }

  async update(id: string, input: UpdateMenuItemInput): Promise<MenuItem> {
    const [r] = await db
      .update(schema.menuItems)
      .set({
        ...(input.categoryId !== undefined
          ? { categoryId: input.categoryId }
          : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.priceSatang !== undefined
          ? { priceSatang: input.priceSatang }
          : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.isAvailable !== undefined
          ? { isAvailable: input.isAvailable }
          : {}),
        ...(input.sortOrder !== undefined
          ? { sortOrder: input.sortOrder }
          : {}),
      })
      .where(eq(schema.menuItems.id, id))
      .returning();
    return toItem(r);
  }

  async delete(id: string): Promise<void> {
    await db.delete(schema.menuItems).where(eq(schema.menuItems.id, id));
  }

  async allImageKeys(): Promise<string[]> {
    const rows = await db
      .select({ imageUrl: schema.menuItems.imageUrl })
      .from(schema.menuItems)
      .where(isNotNull(schema.menuItems.imageUrl));
    return rows.map((r) => r.imageUrl as string);
  }
}
