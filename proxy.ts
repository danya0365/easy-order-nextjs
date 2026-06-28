import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "es_session";
// Mirror of KIOSK_COOKIE in src/infrastructure/auth/kiosk.ts. Hardcoded here on
// purpose: that module is `import "server-only"` and would crash the edge proxy.
const KIOSK_COOKIE = "eo_kiosk";

// Path prefixes that require an authenticated operator. Public areas (/, /s/*,
// /login, /api/slips) are intentionally excluded. This is an OPTIMISTIC check
// only — real role/scope/suspension authorization happens in the route-group
// layouts and inside every Server Action (see Next.js proxy docs: Server
// Functions are POSTs to their route, so never rely on proxy alone).
const PROTECTED_PREFIXES = ["/admin", "/shop", "/staff"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Expose the pathname to layouts (used to let /shop/billing bypass the
  // suspension gate). Forwarded as a request header.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // Kiosk lockdown: once a device is in kiosk mode (holds the eo_kiosk cookie),
  // the only in-app screen it may load is /kiosk — typing/navigating to any
  // other route bounces back to the ordering UI so a walk-in customer can't
  // wander off it. Optimistic (cookie presence only; the edge has no DB — the
  // real shop scoping stays server-validated in requireKioskShop). Kiosk APIs
  // (/api/menu, /api/shop-images) and server actions (POST to /kiosk) are
  // unaffected: /api is excluded from the matcher and /kiosk is allowed.
  // Out of scope: navigating to a DIFFERENT domain (needs OS/MDM kiosk lock).
  if (request.cookies.has(KIOSK_COOKIE)) {
    const inKiosk = pathname === "/kiosk" || pathname.startsWith("/kiosk/");
    if (!inKiosk) {
      const url = request.nextUrl.clone();
      url.pathname = "/kiosk";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (needsAuth && !request.cookies.has(COOKIE_NAME)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Run on all page navigations so the kiosk lockdown can catch any typed URL,
  // excluding API routes, Next internals, and static assets.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|icons/|styles/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webmanifest|txt)).*)",
  ],
};
