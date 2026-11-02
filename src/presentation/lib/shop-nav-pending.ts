/**
 * Client-side "pending navigation" classification for the public shop PWA.
 *
 * Why not route-level loading.tsx: every /s/[slug]/* page calls notFound(); a
 * loading.tsx Suspense boundary above them commits a 200 before notFound() runs
 * (soft 404). So instead the shop layout mounts a tiny client overlay that shows
 * the target route's skeleton the instant a shop link is tapped. Zero server work.
 */
export type ShopNavKind = "menu" | "menuItem" | "order" | "orders" | "home" | "generic";

export type PendingTarget = { kind: ShopNavKind; path: string };

/** Map a clicked href to a skeleton kind, or null when no overlay should show. */
export function classifyShopNav(
  href: string,
  slug: string,
  current: { origin: string; pathname: string; search: string },
): PendingTarget | null {
  let url: URL;
  try {
    url = new URL(href, current.origin + current.pathname);
  } catch {
    return null;
  }
  if (url.origin !== current.origin) return null;
  const base = `/s/${slug}`;
  const p = url.pathname.replace(/\/+$/, "") || "/";
  if (p !== base && !p.startsWith(base + "/")) return null;
  // Same page (hash/query-only changes like category chips) → no overlay.
  if (p === (current.pathname.replace(/\/+$/, "") || "/")) return null;
  const rest = p.slice(base.length);
  // Route handlers / print view: not a normal page transition.
  if (/^\/(enter|join|link|site\.webmanifest|menu\/print)(\/|$)/.test(rest)) return null;
  if (rest === "") return { kind: "home", path: p };
  if (rest === "/menu") return { kind: "menu", path: p };
  if (/^\/menu\/[^/]+$/.test(rest)) return { kind: "menuItem", path: p };
  if (rest === "/order") return { kind: "order", path: p };
  if (rest === "/orders") return { kind: "orders", path: p };
  return { kind: "generic", path: p };
}
