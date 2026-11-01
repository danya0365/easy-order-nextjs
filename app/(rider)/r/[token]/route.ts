import { container } from "@/src/infrastructure/di/container";
import { resolveRider } from "@/src/application/use-cases/rider/RiderUseCases";
import {
  clearRiderCookieHeader,
  riderCookieHeader,
} from "@/src/infrastructure/auth/rider-session";

/**
 * Personal-link login: validate the token, bind it to an httpOnly cookie, then
 * 303 to the rider app at /rider (the token leaves the address bar). An invalid
 * or revoked link clears any old cookie and lands on /rider's friendly
 * "ask the shop for a new link" screen.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const secure = new URL(req.url).protocol === "https:";
  const rider = await resolveRider(container.riderRepository, token).catch(() => null);
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/rider",
      "Set-Cookie": rider ? riderCookieHeader(token, secure) : clearRiderCookieHeader(secure),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
