import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "es_session";

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
  matcher: ["/admin/:path*", "/shop/:path*", "/staff/:path*"],
};
