/**
 * PRODUCTION data — everything safe and needed for a real launch. Idempotent.
 *  - platform admin (password from SEED_ADMIN_PASSWORD when set, else dev default)
 *  - ONE real example shop ("demo") the merchant can use immediately
 *
 * No remote/password guards here — the orchestrator vets those before dispatch.
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { schema, daysFromNow, type SeedContext } from "./_db";
import { getOrCreate, insert } from "./_helpers";
import { DEFAULT_PRICE_PER_DAY_SATANG } from "../../src/domain/services/topup-pricing";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@easystamp.test";

const DEMO_SHOP_SLUG = "demo";
const DEMO_OWNER_EMAIL = "owner@demo.easystamp.test";

export async function seedProduction({ db, passwordHash, log }: SeedContext) {
  // --- Platform admin ---
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminHash = adminPassword
    ? await bcrypt.hash(adminPassword, 10)
    : passwordHash;
  const admin = await getOrCreate(
    db,
    schema.users,
    db.query.users.findFirst({ where: eq(schema.users.email, ADMIN_EMAIL) }),
    {
      email: ADMIN_EMAIL,
      passwordHash: adminHash,
      role: "platform_admin",
      shopId: null,
      branchId: null,
    },
  );
  log(
    admin.created
      ? `production: created platform admin ${ADMIN_EMAIL}`
      : `production: admin ${ADMIN_EMAIL} exists — skip`,
  );

  // --- One real example shop the merchant can use immediately ---
  const shop = await getOrCreate(
    db,
    schema.shops,
    db.query.shops.findFirst({ where: eq(schema.shops.slug, DEMO_SHOP_SLUG) }),
    {
      name: "ร้านตัวอย่าง (Demo)",
      slug: DEMO_SHOP_SLUG,
      status: "active",
    },
  );
  if (!shop.created) {
    log(`production: example shop "${DEMO_SHOP_SLUG}" exists — skip`);
    return;
  }

  // 30-day trial, matching CreateShopUseCase (prepaid day model).
  await insert(db, schema.subscriptions, {
    shopId: shop.id,
    status: "trialing",
    pricePerDaySatang: DEFAULT_PRICE_PER_DAY_SATANG,
    currentPeriodStartAt: daysFromNow(0),
    currentPeriodDueAt: daysFromNow(30),
  });

  await insert(db, schema.branches, {
    shopId: shop.id,
    name: "สาขาหลัก",
    // Central Bangkok, so the public map has a pin right after a launch seed.
    latitude: 13.7563,
    longitude: 100.5018,
    address: "ถนนราชดำเนิน กรุงเทพฯ",
  });

  // Real password on prod (no in-app password change); dev default otherwise.
  const ownerPassword = process.env.SEED_DEMO_OWNER_PASSWORD;
  const ownerHash = ownerPassword
    ? await bcrypt.hash(ownerPassword, 10)
    : passwordHash;
  await insert(db, schema.users, {
    email: DEMO_OWNER_EMAIL,
    passwordHash: ownerHash,
    role: "shop_owner",
    shopId: shop.id,
    branchId: null,
  });

  log(`production: created example shop "${DEMO_SHOP_SLUG}" (${DEMO_OWNER_EMAIL})`);
}
