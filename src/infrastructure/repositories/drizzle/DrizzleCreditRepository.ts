import "server-only";

import { and, count, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/src/infrastructure/db/client";
import type { CreditEntryType } from "@/src/domain/services/credit";
import type {
  ApplyCreditEntryInput,
  CreditLedgerEntry,
  CreditTopup,
  CreditTopupStatus,
  CreditWalletRow,
  ICreditRepository,
  NumberedPage,
} from "@/src/application/repositories/ICreditRepository";

type LedgerRow = typeof schema.creditLedger.$inferSelect;
type TopupRow = typeof schema.creditTopups.$inferSelect;

function parse(v: string | null | undefined): Record<string, unknown> | null {
  if (!v) return null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

function toEntry(r: LedgerRow): CreditLedgerEntry {
  return {
    id: r.id,
    shopId: r.shopId,
    type: r.type,
    amountSatang: r.amountSatang,
    balanceAfterSatang: r.balanceAfterSatang,
    reason: r.reason ?? null,
    actorUserId: r.actorUserId ?? null,
    orderId: r.orderId ?? null,
    topupId: r.topupId ?? null,
    idempotencyKey: r.idempotencyKey ?? null,
    meta: parse(r.meta),
    createdAt: r.createdAt,
  };
}

function toTopup(r: TopupRow): CreditTopup {
  return {
    id: r.id,
    shopId: r.shopId,
    packageId: r.packageId ?? null,
    amountSatang: r.amountSatang,
    bonusSatang: r.bonusSatang,
    slipUrl: r.slipUrl,
    status: r.status,
    note: r.note ?? null,
    submittedBy: r.submittedBy ?? null,
    reviewedBy: r.reviewedBy ?? null,
    reviewedAt: r.reviewedAt ?? null,
    rejectReason: r.rejectReason ?? null,
    verifyMeta: parse(r.verifyMeta),
    createdAt: r.createdAt,
  };
}

const clampPage = (p: number) => Math.max(1, Math.floor(p) || 1);

export class DrizzleCreditRepository implements ICreditRepository {
  async getConfigRaw(id: string): Promise<unknown | null> {
    const [r] = await db.select().from(schema.creditConfigs).where(eq(schema.creditConfigs.id, id)).limit(1);
    if (!r) return null;
    try {
      return JSON.parse(r.config);
    } catch {
      return null;
    }
  }

  async saveConfig(id: string, shopId: string | null, config: unknown, updatedBy: string | null): Promise<void> {
    const json = JSON.stringify(config);
    const now = new Date().toISOString();
    await db
      .insert(schema.creditConfigs)
      .values({ id, shopId, config: json, updatedBy, updatedAt: now })
      .onConflictDoUpdate({ target: schema.creditConfigs.id, set: { config: json, updatedBy, updatedAt: now } });
  }

  async deleteConfig(id: string): Promise<void> {
    await db.delete(schema.creditConfigs).where(eq(schema.creditConfigs.id, id));
  }

  async getBalance(shopId: string): Promise<number> {
    const [r] = await db
      .select({ b: schema.creditWallets.balanceSatang })
      .from(schema.creditWallets)
      .where(eq(schema.creditWallets.shopId, shopId))
      .limit(1);
    return r?.b ?? 0;
  }

  async applyEntry(input: ApplyCreditEntryInput) {
    const id = nanoid();
    const now = new Date().toISOString();
    const amt = Math.round(input.amountSatang);
    const meta = input.meta ? JSON.stringify(input.meta) : null;
    // One batch = one transaction: ensure wallet → insert ledger (skipped on a
    // duplicate idempotency key) → move the balance only if OUR row landed.
    await db.batch([
      db.run(sql`INSERT INTO credit_wallets (shop_id, balance_satang, created_at, updated_at)
        VALUES (${input.shopId}, 0, ${now}, ${now}) ON CONFLICT(shop_id) DO NOTHING`),
      db.run(sql`INSERT INTO credit_ledger (id, shop_id, type, amount_satang, balance_after_satang, reason,
          actor_user_id, order_id, topup_id, idempotency_key, meta, created_at)
        SELECT ${id}, ${input.shopId}, ${input.type}, ${amt}, w.balance_satang + ${amt}, ${input.reason ?? null},
          ${input.actorUserId ?? null}, ${input.orderId ?? null}, ${input.topupId ?? null},
          ${input.idempotencyKey ?? null}, ${meta}, ${now}
        FROM credit_wallets w WHERE w.shop_id = ${input.shopId}
        ON CONFLICT(idempotency_key) DO NOTHING`),
      db.run(sql`UPDATE credit_wallets
        SET balance_satang = (SELECT balance_after_satang FROM credit_ledger WHERE id = ${id}), updated_at = ${now}
        WHERE shop_id = ${input.shopId} AND EXISTS (SELECT 1 FROM credit_ledger WHERE id = ${id})`),
    ]);
    const entry = await this.findEntry(id);
    if (entry) return { applied: true, entry };
    return { applied: false, entry: input.idempotencyKey ? await this.findEntryByKey(input.idempotencyKey) : null };
  }

  async findEntryByKey(key: string) {
    const [r] = await db.select().from(schema.creditLedger).where(eq(schema.creditLedger.idempotencyKey, key)).limit(1);
    return r ? toEntry(r) : null;
  }

  async findEntry(id: string) {
    const [r] = await db.select().from(schema.creditLedger).where(eq(schema.creditLedger.id, id)).limit(1);
    return r ? toEntry(r) : null;
  }

  async pageLedger(shopId: string, opts: { page: number; pageSize: number; type?: CreditEntryType | null }) {
    const t = schema.creditLedger;
    const where = and(eq(t.shopId, shopId), opts.type ? eq(t.type, opts.type) : undefined);
    const page = clampPage(opts.page);
    const [rows, [{ n }]] = await Promise.all([
      db.select().from(t).where(where).orderBy(desc(t.createdAt), desc(t.id)).limit(opts.pageSize).offset((page - 1) * opts.pageSize),
      db.select({ n: count() }).from(t).where(where),
    ]);
    return { items: rows.map(toEntry), total: n, page, pageSize: opts.pageSize };
  }

  async countDeductionsSince(shopId: string, sinceISO: string) {
    const t = schema.creditLedger;
    const [{ n }] = await db
      .select({ n: count() })
      .from(t)
      .where(and(eq(t.shopId, shopId), eq(t.type, "deduction"), sql`${t.createdAt} >= ${sinceISO}`));
    return n;
  }

  async graceUsed(shopId: string) {
    const r = await db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM credit_ledger
      WHERE shop_id = ${shopId} AND type = 'deduction' AND amount_satang < 0 AND balance_after_satang <= 0
        AND created_at > COALESCE((SELECT MAX(created_at) FROM credit_ledger
          WHERE shop_id = ${shopId} AND balance_after_satang > 0), '')`);
    return Number(r?.n ?? 0);
  }

  async pageWallets(opts: { page: number; pageSize: number; q?: string | null }): Promise<NumberedPage<CreditWalletRow>> {
    const s = schema.shops;
    const w = schema.creditWallets;
    const q = opts.q?.trim();
    const where: SQL | undefined = q ? or(like(s.name, `%${q}%`), like(s.slug, `%${q}%`)) : undefined;
    const page = clampPage(opts.page);
    const [rows, [{ n }]] = await Promise.all([
      db
        .select({ shopId: s.id, shopName: s.name, shopSlug: s.slug, balanceSatang: w.balanceSatang, updatedAt: w.updatedAt })
        .from(s)
        .leftJoin(w, eq(w.shopId, s.id))
        .where(where)
        .orderBy(sql`COALESCE(${w.balanceSatang}, 0)`, s.name)
        .limit(opts.pageSize)
        .offset((page - 1) * opts.pageSize),
      db.select({ n: count() }).from(s).where(where),
    ]);
    return {
      items: rows.map((r) => ({ ...r, balanceSatang: r.balanceSatang ?? 0, updatedAt: r.updatedAt ?? null })),
      total: n,
      page,
      pageSize: opts.pageSize,
    };
  }

  async createTopup(input: Omit<CreditTopup, "id" | "status" | "reviewedBy" | "reviewedAt" | "rejectReason" | "createdAt">) {
    const [r] = await db
      .insert(schema.creditTopups)
      .values({ ...input, verifyMeta: input.verifyMeta ? JSON.stringify(input.verifyMeta) : null })
      .returning();
    return toTopup(r);
  }

  async findTopup(id: string) {
    const [r] = await db.select().from(schema.creditTopups).where(eq(schema.creditTopups.id, id)).limit(1);
    return r ? toTopup(r) : null;
  }

  async pageTopups(opts: { page: number; pageSize: number; shopId?: string | null; status?: CreditTopupStatus | null }) {
    const t = schema.creditTopups;
    const where = and(opts.shopId ? eq(t.shopId, opts.shopId) : undefined, opts.status ? eq(t.status, opts.status) : undefined);
    const page = clampPage(opts.page);
    const [rows, [{ n }]] = await Promise.all([
      db.select().from(t).where(where).orderBy(desc(t.createdAt), desc(t.id)).limit(opts.pageSize).offset((page - 1) * opts.pageSize),
      db.select({ n: count() }).from(t).where(where),
    ]);
    return { items: rows.map(toTopup), total: n, page, pageSize: opts.pageSize };
  }

  async claimTopup(id: string, to: "approved" | "rejected", reviewedBy: string, rejectReason: string | null) {
    const t = schema.creditTopups;
    const [r] = await db
      .update(t)
      .set({ status: to, reviewedBy, reviewedAt: new Date().toISOString(), rejectReason })
      .where(and(eq(t.id, id), eq(t.status, "pending")))
      .returning();
    return r ? toTopup(r) : null;
  }

  async unclaimTopup(id: string) {
    const t = schema.creditTopups;
    await db.update(t).set({ status: "pending", reviewedBy: null, reviewedAt: null, rejectReason: null }).where(eq(t.id, id));
  }

  async setTopupVerifyMeta(id: string, meta: Record<string, unknown>) {
    await db.update(schema.creditTopups).set({ verifyMeta: JSON.stringify(meta) }).where(eq(schema.creditTopups.id, id));
  }

  async countPendingTopups() {
    const t = schema.creditTopups;
    const [{ n }] = await db.select({ n: count() }).from(t).where(eq(t.status, "pending"));
    return n;
  }
}

