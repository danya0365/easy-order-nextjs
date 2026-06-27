import "server-only";

import { eq } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { Customer } from "@/src/domain/entities";
import type { ICustomerDeviceRepository } from "@/src/application/repositories/ICustomerDeviceRepository";

type CustomerRow = typeof schema.customers.$inferSelect;

function toCustomer(r: CustomerRow): Customer {
  return {
    id: r.id,
    shopId: r.shopId,
    phone: r.phone,
    displayName: r.displayName,
    publicCode: r.publicCode,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleCustomerDeviceRepository
  implements ICustomerDeviceRepository
{
  async create(customerId: string): Promise<{ token: string }> {
    const [row] = await db
      .insert(schema.customerDevices)
      .values({ customerId })
      .returning();
    return { token: row.id };
  }

  async findByToken(token: string): Promise<{ customer: Customer } | null> {
    const [row] = await db
      .select({ customer: schema.customers })
      .from(schema.customerDevices)
      .innerJoin(
        schema.customers,
        eq(schema.customerDevices.customerId, schema.customers.id),
      )
      .where(eq(schema.customerDevices.id, token))
      .limit(1);
    if (!row) return null;
    // Best-effort touch of lastSeenAt (fire-and-forget).
    void db
      .update(schema.customerDevices)
      .set({ lastSeenAt: new Date().toISOString() })
      .where(eq(schema.customerDevices.id, token));
    return { customer: toCustomer(row.customer) };
  }

  async deleteByCustomer(customerId: string): Promise<void> {
    await db
      .delete(schema.customerDevices)
      .where(eq(schema.customerDevices.customerId, customerId));
  }
}
