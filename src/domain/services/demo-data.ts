/**
 * Pure planner for the admin "demo data" tool. Everything it produces is
 * clearly labelled "[ทดสอบ]" so owners never mistake it for real sales.
 */
export const DEMO_LABEL = "[ทดสอบ]";
export const DEMO_MAX_ORDERS = 30;

export interface DemoMenuItemRef {
  id: string;
  name: string;
  priceSatang: number;
}

export interface DemoPlanOrderLine {
  menuItemId: string | null;
  name: string;
  unitPriceSatang: number;
  quantity: number;
}

export interface DemoPlanOrder {
  /** Index into plan.customers (or null = walk-in). */
  customerIdx: number | null;
  /** Index into plan.riders for delivery orders (or null). */
  riderIdx: number | null;
  orderNo: number;
  channel: "kiosk" | "counter" | "online";
  fulfillmentType: "pickup" | "delivery" | "dine_in";
  paymentMethod: "cash" | "promptpay_qr";
  createdAt: string;
  lines: DemoPlanOrderLine[];
  subtotalSatang: number;
  totalSatang: number;
  note: string;
}

export interface DemoPlan {
  customers: { phone: string; displayName: string; points: number }[];
  riders: { name: string; phone: string }[];
  orders: DemoPlanOrder[];
}

export interface DemoPlanOptions {
  orders: number;
  customers: number;
  riders: number;
  now: Date;
  /** Deterministic randomness source in [0,1). */
  random?: () => number;
}

const FALLBACK_ITEM: DemoMenuItemRef = { id: "", name: `${DEMO_LABEL} เมนูตัวอย่าง`, priceSatang: 5000 };

function clampInt(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(Number.isFinite(v) ? v : 0)));
}

export function buildDemoDataPlan(menu: DemoMenuItemRef[], opts: DemoPlanOptions): DemoPlan {
  const rnd = opts.random ?? Math.random;
  const nOrders = clampInt(opts.orders, 0, DEMO_MAX_ORDERS);
  const nCustomers = clampInt(opts.customers, 0, 10);
  const nRiders = clampInt(opts.riders, 0, 5);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length) % arr.length];
  const items = menu.filter((m) => m.priceSatang >= 0).slice(0, 50);
  const pool = items.length ? items : [FALLBACK_ITEM];
  // Phone prefix 099-99 + random 5 digits: a clearly fake range per batch.
  const tag = String(Math.floor(rnd() * 100000)).padStart(5, "0");

  const customers = Array.from({ length: nCustomers }, (_, i) => ({
    phone: `09999${tag.slice(0, 3)}${String(i).padStart(2, "0")}`,
    displayName: `${DEMO_LABEL} สมาชิก ${i + 1}`,
    points: 20 + Math.floor(rnd() * 180),
  }));
  const riders = Array.from({ length: nRiders }, (_, i) => ({
    name: `${DEMO_LABEL} ไรเดอร์ ${i + 1}`,
    phone: `09998${tag.slice(0, 3)}${String(i).padStart(2, "0")}`,
  }));

  const orders: DemoPlanOrder[] = [];
  for (let i = 0; i < nOrders; i++) {
    const delivery = nRiders > 0 && i % 3 === 0;
    const lineCount = 1 + Math.floor(rnd() * Math.min(3, pool.length));
    const used = new Set<string>();
    const lines: DemoPlanOrderLine[] = [];
    for (let k = 0; k < lineCount; k++) {
      const it = pick(pool);
      if (used.has(it.name)) continue;
      used.add(it.name);
      lines.push({
        menuItemId: it.id || null,
        name: it.name,
        unitPriceSatang: it.priceSatang,
        quantity: 1 + Math.floor(rnd() * 2),
      });
    }
    const subtotal = lines.reduce((a, l) => a + l.unitPriceSatang * l.quantity, 0);
    // Spread over the last 7 days, never in the future.
    const ageMs = Math.floor(((i + 1) / (nOrders + 1)) * 7 * 86_400_000);
    orders.push({
      customerIdx: nCustomers > 0 && i % 2 === 0 ? i % nCustomers : null,
      riderIdx: delivery ? i % nRiders : null,
      orderNo: 900 + i,
      channel: delivery ? "online" : i % 2 === 0 ? "kiosk" : "counter",
      fulfillmentType: delivery ? "delivery" : "pickup",
      paymentMethod: i % 2 === 0 ? "cash" : "promptpay_qr",
      createdAt: new Date(opts.now.getTime() - ageMs).toISOString(),
      lines,
      subtotalSatang: subtotal,
      totalSatang: subtotal,
      note: DEMO_LABEL,
    });
  }
  return { customers, riders, orders };
}
