import "server-only";

import { and, count, eq, gt, gte, isNull } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type {
  CreateBindCodeInput,
  IBindCodeRepository,
} from "@/src/application/repositories/IBindCodeRepository";

export class DrizzleBindCodeRepository implements IBindCodeRepository {
  async create(input: CreateBindCodeInput): Promise<{ code: string }> {
    const [row] = await db
      .insert(schema.bindCodes)
      .values({
        shopId: input.shopId,
        customerId: input.customerId,
        expiresAt: input.expiresAt,
      })
      .returning();
    return { code: row.code };
  }

  async findValid(
    code: string,
    now: Date,
  ): Promise<{ shopId: string; customerId: string } | null> {
    const row = await db.query.bindCodes.findFirst({
      where: and(
        eq(schema.bindCodes.code, code),
        isNull(schema.bindCodes.usedAt),
        gt(schema.bindCodes.expiresAt, now.toISOString()),
      ),
    });
    return row ? { shopId: row.shopId, customerId: row.customerId } : null;
  }

  async markUsed(code: string, at: string): Promise<void> {
    await db
      .update(schema.bindCodes)
      .set({ usedAt: at })
      .where(eq(schema.bindCodes.code, code));
  }

  async countRecentByCustomer(
    customerId: string,
    since: Date,
  ): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(schema.bindCodes)
      .where(
        and(
          eq(schema.bindCodes.customerId, customerId),
          gte(schema.bindCodes.createdAt, since.toISOString()),
        ),
      );
    return row?.value ?? 0;
  }
}
