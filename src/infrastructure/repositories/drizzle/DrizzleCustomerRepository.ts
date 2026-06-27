import "server-only";

import { and, desc, eq, like, or } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { Customer } from "@/src/domain/entities";
import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { Page, PageOpts } from "@/src/application/repositories/pagination";
import { decodeCursor } from "@/src/application/repositories/pagination";
import { cursorWhere, toPage } from "./_cursor";

type Row = typeof schema.customers.$inferSelect;

function toCustomer(r: Row): Customer {
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

export class DrizzleCustomerRepository implements ICustomerRepository {
  async findById(shopId: string, id: string): Promise<Customer | null> {
    const r = await db.query.customers.findFirst({
      where: and(
        eq(schema.customers.shopId, shopId),
        eq(schema.customers.id, id),
      ),
    });
    return r ? toCustomer(r) : null;
  }

  async findByPhone(shopId: string, phone: string): Promise<Customer | null> {
    const r = await db.query.customers.findFirst({
      where: and(
        eq(schema.customers.shopId, shopId),
        eq(schema.customers.phone, phone),
      ),
    });
    return r ? toCustomer(r) : null;
  }

  async anonymize(id: string): Promise<void> {
    // Synthetic, per-customer-unique values so the (shopId, phone) and publicCode
    // unique constraints still hold while the real PII is gone. The old phone /
    // QR code no longer resolve to this person.
    await db
      .update(schema.customers)
      .set({
        phone: `erased:${id}`,
        displayName: "(ลบข้อมูลแล้ว)",
        publicCode: `erased:${id}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.customers.id, id));
  }

  async findByPublicCode(
    shopId: string,
    code: string,
  ): Promise<Customer | null> {
    const r = await db.query.customers.findFirst({
      where: and(
        eq(schema.customers.shopId, shopId),
        eq(schema.customers.publicCode, code),
      ),
    });
    return r ? toCustomer(r) : null;
  }

  async findOrCreate(
    shopId: string,
    phone: string,
    displayName?: string | null,
  ): Promise<Customer> {
    const existing = await this.findByPhone(shopId, phone);
    if (existing) {
      // Fill in a name if we didn't have one and the customer just gave it.
      if (!existing.displayName && displayName) {
        const [r] = await db
          .update(schema.customers)
          .set({ displayName, updatedAt: new Date().toISOString() })
          .where(eq(schema.customers.id, existing.id))
          .returning();
        return toCustomer(r);
      }
      return existing;
    }
    const [r] = await db
      .insert(schema.customers)
      .values({ shopId, phone, displayName: displayName ?? null })
      .returning();
    return toCustomer(r);
  }

  async listByShop(shopId: string, search?: string): Promise<Customer[]> {
    const term = search?.trim();
    const where = term
      ? and(
          eq(schema.customers.shopId, shopId),
          or(
            like(schema.customers.phone, `%${term}%`),
            like(schema.customers.displayName, `%${term}%`),
          ),
        )
      : eq(schema.customers.shopId, shopId);
    const rows = await db.query.customers.findMany({
      where,
      orderBy: desc(schema.customers.createdAt),
      limit: 200,
    });
    return rows.map(toCustomer);
  }

  async pageByShop(
    shopId: string,
    opts: PageOpts & { search?: string } = {},
  ): Promise<Page<Customer>> {
    const limit = opts.limit ?? 30;
    const cur = decodeCursor(opts.cursor);
    const term = opts.search?.trim();
    const search = term
      ? or(
          like(schema.customers.phone, `%${term}%`),
          like(schema.customers.displayName, `%${term}%`),
        )
      : undefined;
    const rows = await db.query.customers.findMany({
      where: and(
        eq(schema.customers.shopId, shopId),
        search,
        cursorWhere(schema.customers.createdAt, schema.customers.id, cur),
      ),
      orderBy: [desc(schema.customers.createdAt), desc(schema.customers.id)],
      limit: limit + 1,
    });
    return toPage(rows.map(toCustomer), limit);
  }
}
