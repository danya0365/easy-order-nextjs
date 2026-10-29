import "server-only";

import { and, count, desc, eq, gte, inArray, or } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type {
  IMemberSignupGuardRepository,
  SignupAttempt,
  SignupAttemptInput,
} from "@/src/application/repositories/IMemberSignupGuardRepository";

type Row = typeof schema.memberSignupAttempts.$inferSelect;

function toAttempt(r: Row): SignupAttempt {
  return {
    id: r.id,
    shopId: r.shopId,
    customerId: r.customerId ?? null,
    ipHash: r.ipHash ?? null,
    deviceId: r.deviceId ?? null,
    phone: r.phone,
    createdAt: r.createdAt,
  };
}

export class DrizzleMemberSignupGuardRepository
  implements IMemberSignupGuardRepository
{
  async recordAttempt(input: SignupAttemptInput): Promise<void> {
    await db.insert(schema.memberSignupAttempts).values(input);
  }

  async countRecentBySource(
    shopId: string,
    ipHash: string | null,
    deviceId: string | null,
    sinceIso: string,
  ): Promise<number> {
    const src = [];
    if (ipHash) src.push(eq(schema.memberSignupAttempts.ipHash, ipHash));
    if (deviceId) src.push(eq(schema.memberSignupAttempts.deviceId, deviceId));
    if (src.length === 0) return 0;
    const [c] = await db
      .select({ value: count() })
      .from(schema.memberSignupAttempts)
      .where(
        and(
          eq(schema.memberSignupAttempts.shopId, shopId),
          gte(schema.memberSignupAttempts.createdAt, sinceIso),
          or(...src),
        ),
      );
    return c?.value ?? 0;
  }

  async listSince(shopId: string, sinceIso: string): Promise<SignupAttempt[]> {
    const rows = await db
      .select()
      .from(schema.memberSignupAttempts)
      .where(
        and(
          eq(schema.memberSignupAttempts.shopId, shopId),
          gte(schema.memberSignupAttempts.createdAt, sinceIso),
        ),
      )
      .limit(2000);
    return rows.map(toAttempt);
  }

  async listByCustomers(
    shopId: string,
    customerIds: string[],
  ): Promise<SignupAttempt[]> {
    if (customerIds.length === 0) return [];
    const rows = await db
      .select()
      .from(schema.memberSignupAttempts)
      .where(
        and(
          eq(schema.memberSignupAttempts.shopId, shopId),
          inArray(schema.memberSignupAttempts.customerId, customerIds),
        ),
      )
      .orderBy(desc(schema.memberSignupAttempts.createdAt));
    return rows.map(toAttempt);
  }

  async isPhoneBlocked(shopId: string, phone: string): Promise<boolean> {
    const r = await db.query.shopBlockedPhones.findFirst({
      where: and(
        eq(schema.shopBlockedPhones.shopId, shopId),
        eq(schema.shopBlockedPhones.phone, phone),
      ),
      columns: { id: true },
    });
    return !!r;
  }

  async unblockPhone(shopId: string, phone: string): Promise<void> {
    await db
      .delete(schema.shopBlockedPhones)
      .where(
        and(
          eq(schema.shopBlockedPhones.shopId, shopId),
          eq(schema.shopBlockedPhones.phone, phone),
        ),
      );
  }

  async blockPhone(
    shopId: string,
    phone: string,
    createdBy: string,
  ): Promise<void> {
    await db
      .insert(schema.shopBlockedPhones)
      .values({ shopId, phone, createdBy })
      .onConflictDoNothing();
  }
}
