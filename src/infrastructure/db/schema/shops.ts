import { randomBytes } from "node:crypto";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shopCategories } from "./shop-categories";

export const SHOP_STATUSES = ["active", "suspended_by_admin"] as const;
export type ShopStatus = (typeof SHOP_STATUSES)[number];

export const shops = sqliteTable(
  "shops",
  {
    id: id(),
    name: text().notNull(),
    // Used in the public URL / kiosk activation: /kiosk?shop=[slug]
    slug: text().notNull().unique(),
    // Manual platform-level suspension; billing-derived suspension is computed, not stored.
    status: text({ enum: SHOP_STATUSES }).notNull().default("active"),
    // Optional shop type (cafe, bakery, ...) for the public directory filter.
    categoryId: text().references(() => shopCategories.id, {
      onDelete: "set null",
    }),
    // Optional storefront logo shown in the kiosk header (public URL).
    logoUrl: text(),
    // PromptPay target (mobile / tax id / e-wallet) used to render the order-payment QR.
    promptpayTarget: text(),
    // Bcrypt hash of the kiosk PIN — required to enter/exit kiosk mode on a device.
    kioskPinHash: text(),
    // Self-service mode: customers pay themselves and tap "ชำระเงินแล้ว" on the
    // kiosk, which marks the order paid + completed (no staff at the counter).
    selfService: integer({ mode: "boolean" }).notNull().default(false),
    // Online ordering: customers order by themselves from the web (outside the kiosk).
    onlineOrderingEnabled: integer({ mode: "boolean" }).notNull().default(false),
    // Fulfillment toggles for online orders (kiosk always offers pickup/dine-in).
    pickupEnabled: integer({ mode: "boolean" }).notNull().default(true),
    deliveryEnabled: integer({ mode: "boolean" }).notNull().default(false),
    // Delivery charge in satang added to the order total when delivered.
    deliveryFeeSatang: integer().notNull().default(0),
    // Free-form delivery instructions shown to the customer on the order form.
    deliveryNotes: text(),
    // Minimum subtotal (satang) for an online order; null = no minimum.
    minOrderSatang: integer(),
    // Platform admin must allow loyalty before the shop can enable the module.
    loyaltyAllowedByAdmin: integer({ mode: "boolean" }).notNull().default(false),
    // Shop-level module toggle. Effective = loyaltyAllowedByAdmin && loyaltyEnabled.
    loyaltyEnabled: integer({ mode: "boolean" }).notNull().default(false),
    // Promotions module gates (mirror loyalty). Effective = allowed && enabled.
    promotionsAllowedByAdmin: integer({ mode: "boolean" }).notNull().default(false),
    promotionsEnabled: integer({ mode: "boolean" }).notNull().default(false),
    // Per-kind toggles (only meaningful when the module is effective).
    stampCardEnabled: integer({ mode: "boolean" }).notNull().default(false),
    spendPointsEnabled: integer({ mode: "boolean" }).notNull().default(false),
    // Shop toggle for membership OTP verification (default OFF — no SMS cost yet).
    memberOtpEnabled: integer({ mode: "boolean" }).notNull().default(false),
    // Revocable secret embedded in the permanent static QR (`/s/{slug}/join?k=`).
    staticJoinToken: text().$defaultFn(() =>
      randomBytes(24).toString("base64url"),
    ),
    staticJoinTokenRotatedAt: text(),
    // Shop toggle: pause NEW static-QR member signups (existing members unaffected).
    memberSignupPaused: integer({ mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("shops_slug_idx").on(t.slug),
    index("shops_category_idx").on(t.categoryId),
  ],
);
