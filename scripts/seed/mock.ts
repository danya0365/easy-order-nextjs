/**
 * MOCK data — fake-but-realistic data for development & demos. DEV ONLY
 * (the orchestrator refuses to run this against a remote DB). Idempotent
 * (keyed by shop slug).
 *
 * Covers the generic tenant + billing surface across every billing state:
 *  - 4 shops: active / overdue-in-grace (banner) / overdue-suspended /
 *    admin-suspended
 *  - branches (incl. an inactive one), owner + staff (incl. an inactive one)
 *  - payments in all 3 states + topup_transactions ledger for approved ones
 *
 * The ordering domain (menu / orders) is seeded separately once it is built.
 */
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { schema, daysFromNow, type SeedContext } from "./_db";
import { getOrCreate, insert, quotePayment, approveTopup } from "./_helpers";
import { DEFAULT_PRICE_PER_DAY_SATANG } from "../../src/domain/services/topup-pricing";

/** Demo kiosk PIN for the active seed shop (so /kiosk is usable out of the box). */
const DEMO_KIOSK_PIN = "1234";
const DEMO_PROMPTPAY = "0812345678";

/** A small demo menu: [category, [ [item, priceBaht], ... ] ]. */
const DEMO_MENU: [string, [string, number][]][] = [
  [
    "เครื่องดื่ม",
    [
      ["อเมริกาโน่", 50],
      ["ลาเต้", 65],
      ["ชาเย็น", 45],
      ["โกโก้", 55],
    ],
  ],
  [
    "ของหวาน",
    [
      ["เค้กช็อกโกแลต", 75],
      ["ครัวซองต์", 60],
    ],
  ],
];

const DAY = 864e5;
const RATE = DEFAULT_PRICE_PER_DAY_SATANG;
const SLIP = "slips/seed-placeholder.png";

type Billing = "active" | "grace" | "suspended" | "admin";

interface ShopSpec {
  name: string;
  slug: string;
  billing: Billing;
  /** Main-branch location (Bangkok). */
  lat: number;
  lng: number;
  address: string;
}

const SHOPS: ShopSpec[] = [
  {
    name: "ร้านอาหาร A",
    slug: "diner-a",
    billing: "active",
    lat: 13.7466,
    lng: 100.5347,
    address: "สยามสแควร์ ปทุมวัน กรุงเทพฯ",
  },
  {
    name: "ร้านชานม C",
    slug: "tea-c",
    billing: "grace", // overdue ~3 days → escalating banner, not blocked
    lat: 13.7373,
    lng: 100.5601,
    address: "อโศก สุขุมวิท กรุงเทพฯ",
  },
  {
    name: "ร้านเบเกอรี่ B",
    slug: "bakery-b",
    billing: "suspended", // overdue > 7 days → blocked
    lat: 13.7649,
    lng: 100.5383,
    address: "อารีย์ พหลโยธิน กรุงเทพฯ",
  },
  {
    name: "ร้านสปา D",
    slug: "spa-d",
    billing: "admin", // admin-suspended
    lat: 13.7305,
    lng: 100.5697,
    address: "ทองหล่อ สุขุมวิท กรุงเทพฯ",
  },
];

function billingFields(b: Billing) {
  switch (b) {
    case "active":
      return { dueOffset: 20, subStatus: "active" as const, shopStatus: "active" as const };
    case "grace":
      return { dueOffset: -3, subStatus: "past_due" as const, shopStatus: "active" as const };
    case "suspended":
      return { dueOffset: -12, subStatus: "past_due" as const, shopStatus: "active" as const };
    case "admin":
      return { dueOffset: 15, subStatus: "active" as const, shopStatus: "suspended_by_admin" as const };
  }
}

export async function seedMock(ctx: SeedContext) {
  const { db, passwordHash, log } = ctx;

  const admin = await db.query.users.findFirst({
    where: eq(schema.users.email, "admin@easyorder.test"),
  });
  if (!admin) {
    throw new Error(
      "mock: ต้องมี platform admin ก่อน — รัน `production` ก่อน (หรือรันแบบไม่ระบุ profile เพื่อ seed ทั้งคู่)",
    );
  }
  const adminId = admin.id;

  for (const opts of SHOPS) {
    const bf = billingFields(opts.billing);

    const shop = await getOrCreate(
      db,
      schema.shops,
      db.query.shops.findFirst({ where: eq(schema.shops.slug, opts.slug) }),
      {
        name: opts.name,
        slug: opts.slug,
        status: bf.shopStatus,
      },
    );
    if (!shop.created) {
      log(`mock: shop "${opts.slug}" exists — skip`);
      continue;
    }
    const shopId = shop.id;

    const subId = await insert(db, schema.subscriptions, {
      shopId,
      status: bf.subStatus,
      pricePerDaySatang: RATE,
      currentPeriodStartAt: daysFromNow(bf.dueOffset - 30),
      currentPeriodDueAt: daysFromNow(bf.dueOffset),
    });

    // Branches — second branch inactive on the admin-suspended shop, to demo state.
    await insert(db, schema.branches, {
      shopId,
      name: `${opts.name} - สาขาหลัก`,
      latitude: opts.lat,
      longitude: opts.lng,
      address: opts.address,
    });
    const branch2Id = await insert(db, schema.branches, {
      shopId,
      name: `${opts.name} - สาขา 2`,
      isActive: opts.billing !== "admin",
      latitude: opts.lat + 0.01,
      longitude: opts.lng + 0.01,
      address: opts.address,
    });

    // Owner + 2 staff (staff2 inactive on the suspended shop).
    const ownerId = await insert(db, schema.users, {
      email: `owner@${opts.slug}.test`,
      passwordHash,
      role: "shop_owner",
      shopId,
      branchId: null,
    });
    await insert(db, schema.users, {
      email: `staff1@${opts.slug}.test`,
      passwordHash,
      role: "branch_staff",
      shopId,
      branchId: branch2Id,
    });
    await insert(db, schema.users, {
      email: `staff2@${opts.slug}.test`,
      passwordHash,
      role: "branch_staff",
      shopId,
      branchId: branch2Id,
      isActive: opts.billing !== "suspended",
    });

    await seedPayments({ ctx, opts, shopId, subId, ownerId, adminId });

    // Give the active shop a ready-to-demo menu + kiosk PIN + PromptPay so the
    // /kiosk flow works immediately after seeding.
    if (opts.billing === "active") {
      await seedMenu(ctx, shopId);
      log(`mock: "${opts.slug}" kiosk PIN=${DEMO_KIOSK_PIN}, PromptPay=${DEMO_PROMPTPAY}`);
    }

    log(`mock: created "${opts.slug}" (${opts.billing})`);
  }
}

/** Seed a demo menu, a kiosk PIN, and a PromptPay target for one shop. */
async function seedMenu(ctx: SeedContext, shopId: string) {
  const { db } = ctx;
  await db
    .update(schema.shops)
    .set({
      promptpayTarget: DEMO_PROMPTPAY,
      kioskPinHash: await bcrypt.hash(DEMO_KIOSK_PIN, 10),
    })
    .where(eq(schema.shops.id, shopId));

  let catOrder = 0;
  for (const [catName, items] of DEMO_MENU) {
    const categoryId = await insert(db, schema.menuCategories, {
      shopId,
      name: catName,
      sortOrder: catOrder++,
    });
    let itemOrder = 0;
    for (const [name, priceBaht] of items) {
      await insert(db, schema.menuItems, {
        shopId,
        categoryId,
        name,
        priceSatang: priceBaht * 100,
        sortOrder: itemOrder++,
      });
    }
  }
}

/** Payment + ledger history per billing state, via the real top-up write path. */
async function seedPayments(args: {
  ctx: SeedContext;
  opts: ShopSpec;
  shopId: string;
  subId: string;
  ownerId: string;
  adminId: string;
}) {
  const { db } = args.ctx;
  const { opts, shopId, subId, ownerId, adminId } = args;

  /** Insert a payment row from a quote; returns its id. */
  async function addPayment(
    packageId: string,
    status: "pending" | "approved" | "rejected",
    submittedDaysAgo: number,
    extra: Record<string, unknown> = {},
  ) {
    const submitNow = new Date(Date.now() - submittedDaysAgo * DAY);
    const expiryAtSubmit = daysFromNow(-submittedDaysAgo);
    const { quote, paymentFields } = quotePayment({
      packageId,
      pricePerDaySatang: RATE,
      expiryAtSubmit,
      now: submitNow,
    });
    const paymentId = await insert(db, schema.payments, {
      shopId,
      subscriptionId: subId,
      ...paymentFields,
      slipUrl: SLIP,
      status,
      submittedBy: ownerId,
      createdAt: daysFromNow(-submittedDaysAgo),
      ...extra,
    });
    return { paymentId, quote, expiryAtSubmit };
  }

  if (opts.billing === "active") {
    // One approved d180 top-up last month → matching ledger row (bonus 20 days).
    const { paymentId, quote, expiryAtSubmit } = await addPayment(
      "d180",
      "approved",
      29,
      { verifiedBy: adminId, verifiedAt: daysFromNow(-28) },
    );
    const { ledgerRow } = approveTopup({
      shopId,
      paymentId,
      reviewerId: adminId,
      daysToAdd: quote.baseDays,
      bonusDays: quote.bonusDays,
      amountSatang: quote.amountSatang,
      expiryBeforeAt: expiryAtSubmit,
      now: new Date(Date.now() - 28 * DAY),
    });
    await insert(db, schema.topupTransactions, {
      ...ledgerRow,
      createdAt: daysFromNow(-28),
    });
  } else if (opts.billing === "grace") {
    // A pending payment awaiting review (no ledger until approved).
    await addPayment("d30", "pending", 0);
  } else if (opts.billing === "suspended") {
    // A rejected attempt + a fresh pending one in the admin queue.
    await addPayment("d30", "rejected", 3, {
      verifiedBy: adminId,
      verifiedAt: daysFromNow(-2),
      rejectReason: "ยอดเงินในสลิปไม่ตรงกับที่แจ้ง",
    });
    await addPayment("d30", "pending", 0);
  }
  // admin-suspended: no payment history needed.
}
