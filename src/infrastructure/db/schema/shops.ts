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
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("shops_slug_idx").on(t.slug),
    index("shops_category_idx").on(t.categoryId),
  ],
);
