import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { TopupTransaction } from "@/src/domain/entities";
import type {
  CreateTopupTransactionInput,
  ITopupTransactionRepository,
} from "@/src/application/repositories/ITopupTransactionRepository";
import type { Page, PageOpts } from "@/src/application/repositories/pagination";
import { decodeCursor } from "@/src/application/repositories/pagination";
import { cursorWhere, toPage } from "./_cursor";

type Row = typeof schema.topupTransactions.$inferSelect;

function toTx(r: Row): TopupTransaction {
  return {
    id: r.id,
    shopId: r.shopId,
    paymentId: r.paymentId,
    type: r.type,
    daysAdded: r.daysAdded,
    bonusDaysAdded: r.bonusDaysAdded,
    amountSatang: r.amountSatang,
    expiryBeforeAt: r.expiryBeforeAt,
    expiryAfterAt: r.expiryAfterAt,
    performedBy: r.performedBy,
    note: r.note,
    createdAt: r.createdAt,
  };
}

export class DrizzleTopupTransactionRepository
  implements ITopupTransactionRepository
{
  async create(input: CreateTopupTransactionInput): Promise<TopupTransaction> {
    const [r] = await db
      .insert(schema.topupTransactions)
      .values({
        shopId: input.shopId,
        paymentId: input.paymentId ?? null,
        type: input.type,
        daysAdded: input.daysAdded,
        bonusDaysAdded: input.bonusDaysAdded,
        amountSatang: input.amountSatang,
        expiryBeforeAt: input.expiryBeforeAt ?? null,
        expiryAfterAt: input.expiryAfterAt,
        performedBy: input.performedBy,
        note: input.note ?? null,
      })
      .returning();
    return toTx(r);
  }

  async listByShop(shopId: string, limit = 20): Promise<TopupTransaction[]> {
    const rows = await db.query.topupTransactions.findMany({
      where: eq(schema.topupTransactions.shopId, shopId),
      orderBy: desc(schema.topupTransactions.createdAt),
      limit,
    });
    return rows.map(toTx);
  }

  async pageByShop(
    shopId: string,
    opts: PageOpts = {},
  ): Promise<Page<TopupTransaction>> {
    const limit = opts.limit ?? 20;
    const cur = decodeCursor(opts.cursor);
    const rows = await db.query.topupTransactions.findMany({
      where: and(
        eq(schema.topupTransactions.shopId, shopId),
        cursorWhere(
          schema.topupTransactions.createdAt,
          schema.topupTransactions.id,
          cur,
        ),
      ),
      orderBy: [
        desc(schema.topupTransactions.createdAt),
        desc(schema.topupTransactions.id),
      ],
      limit: limit + 1,
    });
    return toPage(rows.map(toTx), limit);
  }
}
