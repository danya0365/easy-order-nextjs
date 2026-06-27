import "server-only";

import { and, asc, count, desc, eq, gte, inArray } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type {
  Order,
  OrderItem,
  OrderStatus,
  OrderWithItems,
} from "@/src/domain/entities";
import type {
  CreateOrderInput,
  IOrderRepository,
} from "@/src/application/repositories/IOrderRepository";
import type { Page, PageOpts } from "@/src/application/repositories/pagination";
import { decodeCursor } from "@/src/application/repositories/pagination";
import { cursorWhere, toPage } from "./_cursor";

type OrderRow = typeof schema.orders.$inferSelect;
type ItemRow = typeof schema.orderItems.$inferSelect;

const ACTIVE_STATUSES: OrderStatus[] = ["pending", "preparing", "ready"];
const FINISHED_STATUSES: OrderStatus[] = ["completed", "cancelled"];

function toItem(r: ItemRow): OrderItem {
  return {
    id: r.id,
    orderId: r.orderId,
    shopId: r.shopId,
    menuItemId: r.menuItemId,
    nameSnapshot: r.nameSnapshot,
    unitPriceSatang: r.unitPriceSatang,
    quantity: r.quantity,
    lineTotalSatang: r.lineTotalSatang,
  };
}

function toOrder(r: OrderRow, items: OrderItem[]): OrderWithItems {
  return {
    id: r.id,
    shopId: r.shopId,
    orderNo: r.orderNo,
    status: r.status,
    paymentMethod: r.paymentMethod,
    paymentStatus: r.paymentStatus,
    subtotalSatang: r.subtotalSatang,
    totalSatang: r.totalSatang,
    note: r.note,
    paidAt: r.paidAt,
    readyAt: r.readyAt,
    completedAt: r.completedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    items,
  };
}

/** Start-of-today in Bangkok (UTC+7), as a UTC ISO string, for the daily order number. */
function startOfBangkokDayISO(now: Date): string {
  const bkk = new Date(now.getTime() + 7 * 3600_000);
  const y = bkk.getUTCFullYear();
  const m = bkk.getUTCMonth();
  const d = bkk.getUTCDate();
  // 00:00 Bangkok == 17:00 the previous day UTC.
  return new Date(Date.UTC(y, m, d, -7, 0, 0)).toISOString();
}

async function loadItems(orderIds: string[]): Promise<Map<string, OrderItem[]>> {
  const map = new Map<string, OrderItem[]>();
  if (orderIds.length === 0) return map;
  const rows = await db.query.orderItems.findMany({
    where: inArray(schema.orderItems.orderId, orderIds),
    orderBy: asc(schema.orderItems.id),
  });
  for (const r of rows) {
    const item = toItem(r);
    const list = map.get(item.orderId) ?? [];
    list.push(item);
    map.set(item.orderId, list);
  }
  return map;
}

export class DrizzleOrderRepository implements IOrderRepository {
  async create(input: CreateOrderInput): Promise<OrderWithItems> {
    if (input.items.length === 0) throw new Error("ออเดอร์ต้องมีอย่างน้อย 1 รายการ");

    const lines = input.items.map((i) => ({
      ...i,
      lineTotalSatang: i.unitPriceSatang * i.quantity,
    }));
    const subtotalSatang = lines.reduce((s, l) => s + l.lineTotalSatang, 0);
    const totalSatang = subtotalSatang;

    // Next per-shop daily order number (low-concurrency kiosk; good enough).
    const [c] = await db
      .select({ value: count() })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.shopId, input.shopId),
          gte(schema.orders.createdAt, startOfBangkokDayISO(new Date())),
        ),
      );
    const orderNo = (c?.value ?? 0) + 1;

    const [orderRow] = await db
      .insert(schema.orders)
      .values({
        shopId: input.shopId,
        orderNo,
        paymentMethod: input.paymentMethod,
        subtotalSatang,
        totalSatang,
        note: input.note ?? null,
      })
      .returning();

    const itemRows = await db
      .insert(schema.orderItems)
      .values(
        lines.map((l) => ({
          orderId: orderRow.id,
          shopId: input.shopId,
          menuItemId: l.menuItemId,
          nameSnapshot: l.nameSnapshot,
          unitPriceSatang: l.unitPriceSatang,
          quantity: l.quantity,
          lineTotalSatang: l.lineTotalSatang,
        })),
      )
      .returning();

    return toOrder(orderRow, itemRows.map(toItem));
  }

  async findById(shopId: string, id: string): Promise<OrderWithItems | null> {
    const r = await db.query.orders.findFirst({
      where: and(eq(schema.orders.shopId, shopId), eq(schema.orders.id, id)),
    });
    if (!r) return null;
    const items = await loadItems([r.id]);
    return toOrder(r, items.get(r.id) ?? []);
  }

  async listActiveByShop(shopId: string): Promise<OrderWithItems[]> {
    const rows = await db.query.orders.findMany({
      where: and(
        eq(schema.orders.shopId, shopId),
        inArray(schema.orders.status, ACTIVE_STATUSES),
      ),
      orderBy: asc(schema.orders.createdAt),
    });
    const items = await loadItems(rows.map((r) => r.id));
    return rows.map((r) => toOrder(r, items.get(r.id) ?? []));
  }

  async pageHistoryByShop(
    shopId: string,
    opts: PageOpts = {},
  ): Promise<Page<OrderWithItems>> {
    const limit = opts.limit ?? 20;
    const cur = decodeCursor(opts.cursor);
    const rows = await db.query.orders.findMany({
      where: and(
        eq(schema.orders.shopId, shopId),
        inArray(schema.orders.status, FINISHED_STATUSES),
        cursorWhere(schema.orders.createdAt, schema.orders.id, cur),
      ),
      orderBy: [desc(schema.orders.createdAt), desc(schema.orders.id)],
      limit: limit + 1,
    });
    const items = await loadItems(rows.map((r) => r.id));
    const page = toPage(rows, limit);
    return {
      items: page.items.map((r) => toOrder(r, items.get(r.id) ?? [])),
      nextCursor: page.nextCursor,
    };
  }

  async setStatus(
    shopId: string,
    id: string,
    status: OrderStatus,
  ): Promise<OrderWithItems> {
    const now = new Date().toISOString();
    const [r] = await db
      .update(schema.orders)
      .set({
        status,
        ...(status === "ready" ? { readyAt: now } : {}),
        ...(status === "completed" ? { completedAt: now } : {}),
      })
      .where(and(eq(schema.orders.shopId, shopId), eq(schema.orders.id, id)))
      .returning();
    if (!r) throw new Error("ไม่พบออเดอร์ในร้านนี้");
    const items = await loadItems([r.id]);
    return toOrder(r, items.get(r.id) ?? []);
  }

  async markPaid(shopId: string, id: string): Promise<OrderWithItems> {
    const [r] = await db
      .update(schema.orders)
      .set({ paymentStatus: "paid", paidAt: new Date().toISOString() })
      .where(and(eq(schema.orders.shopId, shopId), eq(schema.orders.id, id)))
      .returning();
    if (!r) throw new Error("ไม่พบออเดอร์ในร้านนี้");
    const items = await loadItems([r.id]);
    return toOrder(r, items.get(r.id) ?? []);
  }
}
