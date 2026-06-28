import "server-only";

import { eq } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { ShopProfile } from "@/src/domain/entities";
import type {
  IShopProfileRepository,
  ShopProfileInput,
} from "@/src/application/repositories/IShopProfileRepository";

type Row = typeof schema.shopProfiles.$inferSelect;

function toProfile(r: Row): ShopProfile {
  return {
    shopId: r.shopId,
    description: r.description,
    openingHours: r.openingHours,
    phone: r.phone,
    lineUrl: r.lineUrl,
    facebookUrl: r.facebookUrl,
    instagramUrl: r.instagramUrl,
    websiteUrl: r.websiteUrl,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleShopProfileRepository implements IShopProfileRepository {
  async get(shopId: string): Promise<ShopProfile | null> {
    const r = await db.query.shopProfiles.findFirst({
      where: eq(schema.shopProfiles.shopId, shopId),
    });
    return r ? toProfile(r) : null;
  }

  async upsert(shopId: string, input: ShopProfileInput): Promise<ShopProfile> {
    const [r] = await db
      .insert(schema.shopProfiles)
      .values({ shopId, ...input })
      .onConflictDoUpdate({
        target: schema.shopProfiles.shopId,
        set: { ...input, updatedAt: new Date().toISOString() },
      })
      .returning();
    return toProfile(r);
  }
}
