import "server-only";

import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { Rider, RiderPayoutRow } from "@/src/domain/entities";
import type {
  IRiderRepository,
  RiderInput,
} from "@/src/application/repositories/IRiderRepository";

type Row = typeof schema.riders.$inferSelect;

function toRider(r: Row): Rider {
  return {
    id: r.id,
    shopId: r.shopId,
    name: r.name,
    phone: r.phone,
    commissionType: r.commissionType,
    commissionValue: r.commissionValue,
    active: !!r.active,
    hasLink: !!r.accessTokenHash,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleRiderRepository implements IRiderRepository {
  async create(shopId: string, input: RiderInput): Promise<Rider> {
    const [r] = await db
      .insert(schema.riders)
      .values({ shopId, ...input })
      .returning();
    return toRider(r);
  }

  async update(
    shopId: string,
    id: string,
    input: Partial<RiderInput> & { active?: boolean },
  ): Promise<Rider> {
    const [r] = await db
      .update(schema.riders)
      .set(input)
      .where(and(eq(schema.riders.shopId, shopId), eq(schema.riders.id, id)))
      .returning();
    if (!r) throw new Error("ไม่พบไรเดอร์ในร้านนี้");
    return toRider(r);
  }

  async findById(shopId: string, id: string): Promise<Rider | null> {
    const r = await db.query.riders.findFirst({
      where: and(eq(schema.riders.shopId, shopId), eq(schema.riders.id, id)),
    });
    return r ? toRider(r) : null;
  }

  async listByShop(shopId: string): Promise<Rider[]> {
    const rows = await db.query.riders.findMany({
      where: eq(schema.riders.shopId, shopId),
      orderBy: asc(schema.riders.createdAt),
    });
    return rows.map(toRider);
  }

  async findActiveByTokenHash(hash: string): Promise<Rider | null> {
    const r = await db.query.riders.findFirst({
      where: and(
        eq(schema.riders.accessTokenHash, hash),
        eq(schema.riders.active, true),
      ),
    });
    return r ? toRider(r) : null;
  }

  async setTokenHash(shopId: string, id: string, hash: string | null): Promise<void> {
    const [r] = await db
      .update(schema.riders)
      .set({ accessTokenHash: hash })
      .where(and(eq(schema.riders.shopId, shopId), eq(schema.riders.id, id)))
      .returning({ id: schema.riders.id });
    if (!r) throw new Error("ไม่พบไรเดอร์ในร้านนี้");
  }

  async payoutSummary(
    shopId: string,
    fromISO: string,
    toISO: string,
  ): Promise<RiderPayoutRow[]> {
    const o = schema.orders;
    const rows = await db
      .select({
        riderId: schema.riders.id,
        riderName: schema.riders.name,
        trips: sql<number>`count(${o.id})`,
        commissionSatang: sql<number>`coalesce(sum(${o.riderCommissionSatang}), 0)`,
        codCollectedSatang: sql<number>`coalesce(sum(case when ${o.codCollected} = 1 then ${o.totalSatang} else 0 end), 0)`,
      })
      .from(o)
      .innerJoin(
        schema.riders,
        and(eq(schema.riders.id, o.riderId), eq(schema.riders.shopId, shopId)),
      )
      .where(
        and(
          eq(o.shopId, shopId),
          eq(o.deliveryStatus, "delivered"),
          gte(o.deliveredAt, fromISO),
          lt(o.deliveredAt, toISO),
        ),
      )
      .groupBy(schema.riders.id, schema.riders.name)
      .orderBy(asc(schema.riders.name));
    return rows.map((r) => ({
      riderId: r.riderId,
      riderName: r.riderName,
      trips: Number(r.trips),
      commissionSatang: Number(r.commissionSatang),
      codCollectedSatang: Number(r.codCollectedSatang),
    }));
  }
}
