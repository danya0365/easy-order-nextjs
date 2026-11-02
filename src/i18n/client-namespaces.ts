/**
 * Message namespaces shipped to the browser, PER ROUTE GROUP. Serialising the
 * whole client catalog (~140 KB) into every page's HTML + RSC payload was a large
 * share of per-request CPU, so each route-group layout wraps its subtree in a
 * NextIntlClientProvider with only what its client components use. The root
 * layout ships BASE only. `client-namespaces.test.ts` traces the imports of every
 * group and fails if a client component's `useTranslations("ns")` isn't covered.
 *
 * Nested providers REPLACE (not merge) messages, so every group includes BASE.
 */
export const BASE_NAMESPACES = ["common", "error", "layout", "theme"] as const;

export const GROUP_NAMESPACES = {
  auth: ["auth", "admin"],
  kiosk: ["kiosk", "menuOptions"],
  platform: ["admin", "adminConfig", "adminUsers", "analytics", "auth", "channels", "leads", "loyalty", "promotions", "reviews"],
  public: ["map", "auth"],
  rider: ["rider"],
  shop: [
    "admin", "analytics", "auth", "billing", "channels", "customerDetail", "customersCrm", "kiosk", "loyalty", "map",
    "menu", "menuBulk", "menuOptions", "order", "promote", "promotions", "publicMenu", "reviews", "rider", "shop", "shopPages",
  ],
  shopCustomer: ["loyalty", "map", "menuOptions", "order", "publicMenu", "reviews", "shop", "shopPages"],
  staff: ["auth", "channels", "customerDetail", "customersCrm", "loyalty", "order", "shop", "shopPages"],
} as const;

export type ClientGroup = keyof typeof GROUP_NAMESPACES;

/** Route-group folder → group key (used by the coverage test). */
export const GROUP_DIRS: Record<ClientGroup, string> = {
  auth: "(auth)",
  kiosk: "(kiosk)",
  platform: "(platform)",
  public: "(public)",
  rider: "(rider)",
  shop: "(shop)",
  shopCustomer: "(shop-customer)",
  staff: "(staff)",
};
