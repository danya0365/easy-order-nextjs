import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "@/src/infrastructure/db/client";
import { container } from "@/src/infrastructure/di/container";
import { CreateShopUseCase } from "@/src/application/use-cases/shop/CreateShopUseCase";
import type { Shop } from "@/src/domain/entities";

/**
 * Apply all Drizzle migrations to the (in-memory, per-subprocess) test DB. Call
 * once in a `before()` hook of an integration test file. The DB url is forced to
 * ":memory:" by scripts/test.mjs, so each test FILE gets a fresh schema+data.
 */
export async function migrateTestDb(): Promise<void> {
  await migrate(db, { migrationsFolder: "drizzle" });
}

/** Onboard a real shop (shop + owner + trial sub + default branch) for tests. */
export async function seedShop(slug: string): Promise<{
  shop: Shop;
  ownerId: string;
}> {
  const { shop } = await new CreateShopUseCase(
    container.shopRepository,
    container.userRepository,
    container.subscriptionRepository,
    container.passwordHasher,
    container.branchRepository,
  ).execute({
    name: `Shop ${slug}`,
    slug,
    ownerEmail: `${slug}@test.local`,
    ownerPassword: "password123",
  });
  const owner = (await container.userRepository.listByShop(shop.id)).find(
    (u) => u.role === "shop_owner",
  )!;
  return { shop, ownerId: owner.id };
}
