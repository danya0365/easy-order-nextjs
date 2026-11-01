import "server-only";

import { and, count, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db, schema } from "@/src/infrastructure/db/client";
import type { DemoPlan } from "@/src/domain/services/demo-data";
import type {
  DemoDataCounts,
  IDemoDataRepository,
} from "@/src/application/repositories/IDemoDataRepository";

type Kind = (typeof schema.DEMO_DATA_KINDS)[number];

export class DrizzleDemoDataRepository implements IDemoDataRepository {
  async insertPlan(shopId: string, plan: DemoPlan, batchId: string): Promise<DemoDataCounts> {
    const track = (kind: Kind, rowId: string) =>
      db.insert(schema.demoDataRows).values({ shopId, kind, rowId, batchId });

    const customerIds: (string | null)[] = [];
    for (const c of plan.customers) {
      const id = nanoid();
      const res = await db
        .insert(schema.customers)
        .values({ id, shopId, phone: c.phone, displayName: c.displayName })
        .onConflictDoNothing()
        .returning({ id: schema.customers.id });
      if (!res.length) {
        customerIds.push(null);
        continue;
      }
      await track("customer", id);
      customerIds.push(id);
      await db.insert(schema.loyaltyPointsBalances).values({
        shopId,
        customerId: id,
        currentPoints: c.points,
        lifetimeEarned: c.points,
      });
      await db.insert(schema.loyaltyPointsTransactions).values({
        shopId,
        customerId: id,
        type: "earn",
        quantity: c.points,
        note: "[ทดสอบ]",
      });
    }

    const riderIds: string[] = [];
    for (const r of plan.riders) {
      const id = nanoid();
      // Inactive so demo riders never show up for real assignment.
      await db.insert(schema.riders).values({ id, shopId, name: r.name, phone: r.phone, active: false });
      await track("rider", id);
      riderIds.push(id);
    }

    let orders = 0;
    for (const o of plan.orders) {
      const id = nanoid();
      const customerId = o.customerIdx != null ? customerIds[o.customerIdx] : null;
      const cust = o.customerIdx != null ? plan.customers[o.customerIdx] : null;
      const riderId = o.riderIdx != null ? riderIds[o.riderIdx] : null;
      const at = o.createdAt;
      await db.insert(schema.orders).values({
        id,
        shopId,
        orderNo: o.orderNo,
        status: "completed",
        paymentMethod: o.paymentMethod,
        paymentStatus: "paid",
        channel: o.channel,
        fulfillmentType: o.fulfillmentType,
        deliveryAddress: riderId ? "[ทดสอบ] ที่อยู่ตัวอย่าง" : null,
        subtotalSatang: o.subtotalSatang,
        totalSatang: o.totalSatang,
        note: o.note,
        customerId,
        customerName: customerId && cust ? cust.displayName : null,
        customerPhone: customerId && cust ? cust.phone : null,
        riderId,
        deliveryStatus: riderId ? "delivered" : null,
        assignedAt: riderId ? at : null,
        pickedUpAt: riderId ? at : null,
        deliveredAt: riderId ? at : null,
        codCollected: !!riderId && o.paymentMethod === "cash",
        riderCommissionSatang: riderId ? 2000 : null,
        paidAt: at,
        completedAt: at,
        createdAt: at,
        updatedAt: at,
      });
      for (const l of o.lines) {
        await db.insert(schema.orderItems).values({
          orderId: id,
          shopId,
          menuItemId: l.menuItemId,
          nameSnapshot: l.name,
          unitPriceSatang: l.unitPriceSatang,
          quantity: l.quantity,
          lineTotalSatang: l.unitPriceSatang * l.quantity,
        });
      }
      await track("order", id);
      orders++;
    }
    return { orders, customers: customerIds.filter(Boolean).length, riders: riderIds.length };
  }

  async clear(shopId: string): Promise<DemoDataCounts> {
    const rows = await db
      .select({ kind: schema.demoDataRows.kind, rowId: schema.demoDataRows.rowId })
      .from(schema.demoDataRows)
      .where(eq(schema.demoDataRows.shopId, shopId));
    const ids = (k: Kind) => rows.filter((r) => r.kind === k).map((r) => r.rowId);
    const o = ids("order");
    const c = ids("customer");
    const r = ids("rider");
    // Orders first (items cascade), then customers (points cascade), then riders.
    for (const chunk of chunks(o)) {
      await db.delete(schema.orders).where(and(eq(schema.orders.shopId, shopId), inArray(schema.orders.id, chunk)));
    }
    for (const chunk of chunks(c)) {
      await db.delete(schema.customers).where(and(eq(schema.customers.shopId, shopId), inArray(schema.customers.id, chunk)));
    }
    for (const chunk of chunks(r)) {
      await db.delete(schema.riders).where(and(eq(schema.riders.shopId, shopId), inArray(schema.riders.id, chunk)));
    }
    await db.delete(schema.demoDataRows).where(eq(schema.demoDataRows.shopId, shopId));
    return { orders: o.length, customers: c.length, riders: r.length };
  }

  async counts(shopId: string): Promise<DemoDataCounts> {
    const rows = await db
      .select({ kind: schema.demoDataRows.kind, n: count() })
      .from(schema.demoDataRows)
      .where(eq(schema.demoDataRows.shopId, shopId))
      .groupBy(schema.demoDataRows.kind);
    const get = (k: Kind) => rows.find((x) => x.kind === k)?.n ?? 0;
    return { orders: get("order"), customers: get("customer"), riders: get("rider") };
  }
}

function chunks<T>(arr: T[], size = 50): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
