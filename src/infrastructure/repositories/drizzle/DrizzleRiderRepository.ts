import "server-only";

import { and, asc, count, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type {
  Rider,
  RiderAccount,
  RiderPayoutRow,
  RiderShopMembership,
} from "@/src/domain/entities";
import type {
  IRiderRepository,
  NewRiderAccountInput,
  RiderInput,
} from "@/src/application/repositories/IRiderRepository";

type Row = typeof schema.riders.$inferSelect;
type AccountRow = typeof schema.riderAccounts.$inferSelect;

const r = schema.riders;
const a = schema.riderAccounts;

/** Membership → entity. The account photo (global) wins over the legacy per-shop one. */
function toRider(row: Row, accountAvatar: string | null = null): Rider {
  return {
    id: row.id,
    shopId: row.shopId,
    name: row.name,
    phone: row.phone,
    commissionType: row.commissionType,
    commissionValue: row.commissionValue,
    active: !!row.active,
    lineId: row.lineId ?? null,
    available: row.available ?? true,
    availableUpdatedAt: row.availableUpdatedAt ?? null,
    avatarUrl: accountAvatar ?? row.avatarUrl ?? null,
    hasLink: !!row.accessTokenHash,
    accountId: row.accountId ?? "",
    status: row.status === "invited" ? "invited" : "approved",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toAccount(row: AccountRow): RiderAccount {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    avatarUrl: row.avatarUrl ?? null,
    available: !!row.available,
    availableUpdatedAt: row.availableUpdatedAt ?? null,
    sessionEpoch: row.sessionEpoch ?? 0,
    mergedIntoId: row.mergedIntoId ?? null,
  };
}

/** riders ⟕ rider_accounts (for the account photo). */
function selectRiders() {
  return db
    .select({ rider: r, accountAvatar: a.avatarUrl })
    .from(r)
    .leftJoin(a, eq(a.id, r.accountId));
}

export class DrizzleRiderRepository implements IRiderRepository {
  async create(
    shopId: string,
    input: RiderInput & { accountId: string; status: "invited" | "approved" },
  ): Promise<Rider> {
    const [row] = await db.insert(r).values({ shopId, ...input }).returning();
    return (await this.findById(shopId, row.id)) ?? toRider(row);
  }

  async update(
    shopId: string,
    id: string,
    input: Partial<RiderInput> & { active?: boolean },
  ): Promise<Rider> {
    const [row] = await db
      .update(r)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(and(eq(r.shopId, shopId), eq(r.id, id)))
      .returning();
    if (!row) throw new Error("ไม่พบไรเดอร์ในร้านนี้");
    return (await this.findById(shopId, id)) ?? toRider(row);
  }

  async findById(shopId: string, id: string): Promise<Rider | null> {
    const [row] = await selectRiders().where(and(eq(r.shopId, shopId), eq(r.id, id))).limit(1);
    return row ? toRider(row.rider, row.accountAvatar) : null;
  }

  async listByShop(shopId: string): Promise<Rider[]> {
    const rows = await selectRiders().where(eq(r.shopId, shopId)).orderBy(asc(r.createdAt));
    return rows.map((x) => toRider(x.rider, x.accountAvatar));
  }

  async listByShopPaged(
    shopId: string,
    offset: number,
    limit: number,
  ): Promise<{ items: Rider[]; total: number }> {
    const [rows, [{ n }]] = await Promise.all([
      selectRiders()
        .where(eq(r.shopId, shopId))
        .orderBy(asc(r.createdAt), asc(r.id))
        .limit(limit)
        .offset(offset),
      db.select({ n: count() }).from(r).where(eq(r.shopId, shopId)),
    ]);
    return { items: rows.map((x) => toRider(x.rider, x.accountAvatar)), total: Number(n) };
  }

  async findByShopAndPhone(shopId: string, phone: string): Promise<Rider[]> {
    const rows = await selectRiders().where(and(eq(r.shopId, shopId), eq(r.phone, phone)));
    return rows.map((x) => toRider(x.rider, x.accountAvatar));
  }

  async findByShopAndAccount(shopId: string, accountId: string): Promise<Rider | null> {
    const [row] = await selectRiders()
      .where(and(eq(r.shopId, shopId), eq(r.accountId, accountId)))
      .limit(1);
    return row ? toRider(row.rider, row.accountAvatar) : null;
  }

  async findActiveByTokenHash(hash: string): Promise<Rider | null> {
    const [row] = await selectRiders()
      .where(and(eq(r.accessTokenHash, hash), eq(r.active, true)))
      .limit(1);
    return row ? toRider(row.rider, row.accountAvatar) : null;
  }

  async setTokenHash(shopId: string, id: string, hash: string | null): Promise<void> {
    const [row] = await db
      .update(r)
      .set({ accessTokenHash: hash })
      .where(and(eq(r.shopId, shopId), eq(r.id, id)))
      .returning({ id: r.id });
    if (!row) throw new Error("ไม่พบไรเดอร์ในร้านนี้");
  }

  async setAvailable(shopId: string, id: string, available: boolean): Promise<Rider> {
    const [row] = await db
      .update(r)
      .set({ available, availableUpdatedAt: new Date().toISOString() })
      .where(and(eq(r.shopId, shopId), eq(r.id, id)))
      .returning();
    if (!row) throw new Error("ไม่พบไรเดอร์ในร้านนี้");
    return (await this.findById(shopId, id)) ?? toRider(row);
  }

  async payoutSummary(shopId: string, fromISO: string, toISO: string): Promise<RiderPayoutRow[]> {
    const o = schema.orders;
    const rows = await db
      .select({
        riderId: r.id,
        riderName: r.name,
        trips: sql<number>`count(${o.id})`,
        commissionSatang: sql<number>`coalesce(sum(${o.riderCommissionSatang}), 0)`,
        // Cash the rider holds for the shop: collected COD, or a cash order still unpaid after delivery.
        codCollectedSatang: sql<number>`coalesce(sum(case when ${o.codCollected} = 1 or (${o.paymentMethod} = 'cash' and ${o.paymentStatus} <> 'paid') then ${o.totalSatang} else 0 end), 0)`,
      })
      .from(o)
      .innerJoin(r, and(eq(r.id, o.riderId), eq(r.shopId, shopId)))
      .where(
        and(
          eq(o.shopId, shopId),
          eq(o.deliveryStatus, "delivered"),
          gte(o.deliveredAt, fromISO),
          lt(o.deliveredAt, toISO),
        ),
      )
      .groupBy(r.id, r.name)
      .orderBy(asc(r.name));
    return rows.map((x) => ({
      riderId: x.riderId,
      riderName: x.riderName,
      trips: Number(x.trips),
      commissionSatang: Number(x.commissionSatang),
      codCollectedSatang: Number(x.codCollectedSatang),
    }));
  }

  async findAvatarKey(id: string): Promise<string | null> {
    const [row] = await selectRiders().where(eq(r.id, id)).limit(1);
    return row ? (row.accountAvatar ?? row.rider.avatarUrl ?? null) : null;
  }

  // --- global account ---

  async createAccount(input: NewRiderAccountInput): Promise<RiderAccount> {
    const [row] = await db.insert(a).values(input).returning();
    return toAccount(row);
  }

  async findAccountById(id: string): Promise<RiderAccount | null> {
    const row = await db.query.riderAccounts.findFirst({ where: eq(a.id, id) });
    return row ? toAccount(row) : null;
  }

  async findAccountByPhoneKey(phoneKey: string): Promise<RiderAccount | null> {
    const row = await db.query.riderAccounts.findFirst({
      where: and(eq(a.phoneKey, phoneKey), isNull(a.mergedIntoId)),
    });
    return row ? toAccount(row) : null;
  }

  async listMembershipsByAccount(accountId: string): Promise<RiderShopMembership[]> {
    const rows = await db
      .select({ rider: r, accountAvatar: a.avatarUrl, shopName: schema.shops.name, shopSlug: schema.shops.slug })
      .from(r)
      .innerJoin(schema.shops, eq(schema.shops.id, r.shopId))
      .leftJoin(a, eq(a.id, r.accountId))
      .where(eq(r.accountId, accountId))
      .orderBy(asc(r.createdAt));
    return rows.map((x) => ({
      rider: toRider(x.rider, x.accountAvatar),
      shopId: x.rider.shopId,
      shopName: x.shopName,
      shopSlug: x.shopSlug,
    }));
  }

  async approveMembership(id: string): Promise<void> {
    await db
      .update(r)
      .set({ status: "approved", updatedAt: new Date().toISOString() })
      .where(eq(r.id, id));
  }

  async moveMembership(id: string, toAccountId: string): Promise<void> {
    await db
      .update(r)
      .set({ accountId: toAccountId, status: "approved", updatedAt: new Date().toISOString() })
      .where(eq(r.id, id));
  }

  async markAccountMerged(fromId: string, intoId: string): Promise<void> {
    const [from, into] = await Promise.all([
      db.query.riderAccounts.findFirst({ where: eq(a.id, fromId) }),
      db.query.riderAccounts.findFirst({ where: eq(a.id, intoId) }),
    ]);
    if (!from || !into || fromId === intoId) return;
    const now = new Date().toISOString();
    await db.update(a).set({ mergedIntoId: intoId, phoneKey: null, updatedAt: now }).where(eq(a.id, fromId));
    if (!into.phoneKey && from.phoneKey) {
      await db.update(a).set({ phoneKey: from.phoneKey, updatedAt: now }).where(eq(a.id, intoId));
    }
  }

  async setAccountAvailable(accountId: string, available: boolean): Promise<void> {
    const now = new Date().toISOString();
    await db.update(a).set({ available, availableUpdatedAt: now }).where(eq(a.id, accountId));
    await db.update(r).set({ available, availableUpdatedAt: now }).where(eq(r.accountId, accountId));
  }

  async setAccountAvatar(accountId: string, key: string | null): Promise<string | null> {
    const prev = await db.query.riderAccounts.findFirst({
      where: eq(a.id, accountId),
      columns: { avatarUrl: true },
    });
    if (!prev) throw new Error("ไม่พบบัญชีไรเดอร์");
    await db
      .update(a)
      .set({ avatarUrl: key, updatedAt: new Date().toISOString() })
      .where(eq(a.id, accountId));
    return prev.avatarUrl ?? null;
  }
}
