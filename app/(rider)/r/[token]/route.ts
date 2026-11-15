import {
  clearRiderCookieHeader,
  riderCookieHeader,
  riderInviteCookieHeader,
  riderLinkUseCases,
  riderSessionCookieHeader,
  riderSessionFromRequest,
} from "@/src/infrastructure/auth/rider-session";

const SEC_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

/**
 * Shop personal link = login for THAT shop + invitation. Approved membership →
 * signed account session scoped to this shop (added to the device's scope when
 * it is already signed in to the same account). Invitations, or a link for a
 * different account than the one signed in on this device, go to the confirm
 * page (/rider-join) with the token parked in a short-lived httpOnly cookie,
 * so it leaves the address bar.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const secure = new URL(req.url).protocol === "https:";
  const current = await riderSessionFromRequest(req).catch(() => null);
  const decision = await riderLinkUseCases().open(token, current).catch(() => ({ kind: "invalid" as const }));
  const headers = new Headers(SEC_HEADERS);
  if (decision.kind === "invalid") {
    if (!current) headers.append("Set-Cookie", clearRiderCookieHeader(secure));
    headers.set("Location", current ? "/rider?e=link" : "/rider");
  } else if (decision.kind === "login") {
    headers.append(
      "Set-Cookie",
      riderSessionCookieHeader(decision.payload, secure) ?? riderCookieHeader(token, secure),
    );
    headers.set("Location", "/rider");
  } else {
    headers.append("Set-Cookie", riderInviteCookieHeader(token, secure));
    headers.set("Location", "/rider-join");
  }
  return new Response(null, { status: 303, headers });
}
