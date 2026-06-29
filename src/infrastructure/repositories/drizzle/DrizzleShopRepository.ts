import "server-only";

import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { Shop } from "@/src/domain/entities";
import type {
  CreateShopInput,
  IShopRepository,
  UpdateShopSettingsInput,
} from "@/src/application/repositories/IShopRepository";
import type { ShopStatus } from "@/src/domain/entities";

type Row = typeof schema.shops.$inferSelect;

function toShop(r: Row): Shop {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    status: r.status,
    categoryId: r.categoryId,
    logoUrl: r.logoUrl,
    promptpayTarget: r.promptpayTarget,
    hasKioskPin: r.kioskPinHash != null,
    selfService: r.selfService,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleShopRepository implements IShopRepository {
  async create(input: CreateShopInput): Promise<Shop> {
    const [r] = await db
      .insert(schema.shops)
      .values({
        name: input.name,
        slug: input.slug,
        categoryId: input.categoryId ?? null,
        logoUrl: input.logoUrl ?? null,
        promptpayTarget: input.promptpayTarget ?? null,
      })
      .returning();
    return toShop(r);
  }

  async findById(id: string): Promise<Shop | null> {
    const r = await db.query.shops.findFirst({ where: eq(schema.shops.id, id) });
    return r ? toShop(r) : null;
  }

  async findBySlug(slug: string): Promise<Shop | null> {
    const r = await db.query.shops.findFirst({
      where: eq(schema.shops.slug, slug),
    });
    return r ? toShop(r) : null;
  }

  async list(): Promise<Shop[]> {
    const rows = await db.query.shops.findMany({
      orderBy: asc(schema.shops.createdAt),
    });
    return rows.map(toShop);
  }

  async updateSettings(
    id: string,
    input: UpdateShopSettingsInput,
  ): Promise<Shop> {
    const [r] = await db
      .update(schema.shops)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.categoryId !== undefined
          ? { categoryId: input.categoryId }
          : {}),
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
        ...(input.promptpayTarget !== undefined
          ? { promptpayTarget: input.promptpayTarget }
          : {}),
        ...(input.kioskPinHash !== undefined
          ? { kioskPinHash: input.kioskPinHash }
          : {}),
      })
      .where(eq(schema.shops.id, id))
      .returning();
    return toShop(r);
  }

  async setStatus(id: string, status: ShopStatus): Promise<Shop> {
    const [r] = await db
      .update(schema.shops)
      .set({ status })
      .where(eq(schema.shops.id, id))
      .returning();
    return toShop(r);
  }

  async setSelfService(id: string, on: boolean): Promise<Shop> {
    const [r] = await db
      .update(schema.shops)
      .set({ selfService: on })
      .where(eq(schema.shops.id, id))
      .returning();
    return toShop(r);
  }

  async getKioskPinHash(id: string): Promise<string | null> {
    const r = await db.query.shops.findFirst({
      where: eq(schema.shops.id, id),
      columns: { kioskPinHash: true },
    });
    return r?.kioskPinHash ?? null;
  }
}
