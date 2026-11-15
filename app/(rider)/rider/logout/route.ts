import { clearRiderCookieHeader } from "@/src/infrastructure/auth/rider-session";

/** Sign this device out of the rider app (plain form POST). */
export async function POST(req: Request) {
  const secure = new URL(req.url).protocol === "https:";
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/rider",
      "Set-Cookie": clearRiderCookieHeader(secure),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
