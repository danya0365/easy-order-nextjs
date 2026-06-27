import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { Payment, PaymentStatus } from "@/src/domain/entities";
import type {
  CreatePaymentInput,
  IPaymentRepository,
  ResolvePaymentInput,
} from "@/src/application/repositories/IPaymentRepository";
import type { Page, PageOpts } from "@/src/application/repositories/pagination";
import { decodeCursor } from "@/src/application/repositories/pagination";
import { cursorWhere, toPage } from "./_cursor";

type Row = typeof schema.payments.$inferSelect;

function toPayment(r: Row): Payment {
  return {
    id: r.id,
    shopId: r.shopId,
    subscriptionId: r.subscriptionId,
    amountSatang: r.amountSatang,
    daysToAdd: r.daysToAdd,
    bonusDays: r.bonusDays,
    packageId: r.packageId,
    slipUrl: r.slipUrl,
    status: r.status,
    submittedBy: r.submittedBy,
    verifiedBy: r.verifiedBy,
    verifiedAt: r.verifiedAt,
    rejectReason: r.rejectReason,
    coversPeriodStartAt: r.coversPeriodStartAt,
    coversPeriodDueAt: r.coversPeriodDueAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class DrizzlePaymentRepository implements IPaymentRepository {
  async create(input: CreatePaymentInput): Promise<Payment> {
    const [r] = await db
      .insert(schema.payments)
      .values({
        shopId: input.shopId,
        subscriptionId: input.subscriptionId,
        amountSatang: input.amountSatang,
        daysToAdd: input.daysToAdd,
        bonusDays: input.bonusDays,
        packageId: input.packageId,
        slipUrl: input.slipUrl,
        submittedBy: input.submittedBy,
        coversPeriodStartAt: input.coversPeriodStartAt,
        coversPeriodDueAt: input.coversPeriodDueAt,
      })
      .returning();
    return toPayment(r);
  }

  async findById(id: string): Promise<Payment | null> {
    const r = await db.query.payments.findFirst({
      where: eq(schema.payments.id, id),
    });
    return r ? toPayment(r) : null;
  }

  async listByShop(shopId: string, limit = 50): Promise<Payment[]> {
    const rows = await db.query.payments.findMany({
      where: eq(schema.payments.shopId, shopId),
      orderBy: desc(schema.payments.createdAt),
      limit,
    });
    return rows.map(toPayment);
  }

  async listByStatus(status: PaymentStatus): Promise<Payment[]> {
    const rows = await db.query.payments.findMany({
      where: eq(schema.payments.status, status),
      orderBy: desc(schema.payments.createdAt),
    });
    return rows.map(toPayment);
  }

  async pageByShop(shopId: string, opts: PageOpts = {}): Promise<Page<Payment>> {
    const limit = opts.limit ?? 20;
    const cur = decodeCursor(opts.cursor);
    const rows = await db.query.payments.findMany({
      where: and(
        eq(schema.payments.shopId, shopId),
        cursorWhere(schema.payments.createdAt, schema.payments.id, cur),
      ),
      orderBy: [desc(schema.payments.createdAt), desc(schema.payments.id)],
      limit: limit + 1,
    });
    return toPage(rows.map(toPayment), limit);
  }

  async pageByStatus(
    status: PaymentStatus,
    opts: PageOpts = {},
  ): Promise<Page<Payment>> {
    const limit = opts.limit ?? 20;
    const cur = decodeCursor(opts.cursor);
    const rows = await db.query.payments.findMany({
      where: and(
        eq(schema.payments.status, status),
        cursorWhere(schema.payments.createdAt, schema.payments.id, cur),
      ),
      orderBy: [desc(schema.payments.createdAt), desc(schema.payments.id)],
      limit: limit + 1,
    });
    return toPage(rows.map(toPayment), limit);
  }

  async resolve(id: string, input: ResolvePaymentInput): Promise<Payment> {
    const [r] = await db
      .update(schema.payments)
      .set({
        status: input.status,
        verifiedBy: input.verifiedBy,
        verifiedAt: input.verifiedAt,
        rejectReason: input.rejectReason ?? null,
      })
      .where(eq(schema.payments.id, id))
      .returning();
    return toPayment(r);
  }

  async allSlipKeys(): Promise<string[]> {
    const rows = await db
      .select({ key: schema.payments.slipUrl })
      .from(schema.payments);
    return rows.map((r) => r.key).filter(Boolean);
  }
}
