import {
  clearRiderInviteCookieHeader,
  riderInviteTokenFromRequest,
  riderLinkUseCases,
  riderSessionCookieHeader,
  riderSessionFromRequest,
} from "@/src/infrastructure/auth/rider-session";

const CHOICES = ["accept", "attach", "new_account", "switch"] as const;
type Choice = (typeof CHOICES)[number];

/** Confirm-page POST: apply the rider's choice, re-sign the session, back to the app. */
export async function POST(req: Request) {
  const secure = new URL(req.url).protocol === "https:";
  const headers = new Headers({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
  const token = riderInviteTokenFromRequest(req);
  try {
    const choice = String((await req.formData()).get("choice") ?? "") as Choice;
    if (!token || !CHOICES.includes(choice)) throw new Error("ลิงก์หมดอายุ — เปิดลิงก์จากร้านอีกครั้ง");
    const current = await riderSessionFromRequest(req);
    const payload = await riderLinkUseCases().decide(token, current, choice);
    const cookie = riderSessionCookieHeader(payload, secure);
    if (!cookie) throw new Error("ระบบยังไม่พร้อม (ไม่มีคีย์ลงชื่อ)");
    headers.append("Set-Cookie", cookie);
    headers.append("Set-Cookie", clearRiderInviteCookieHeader(secure));
    headers.set("Location", "/rider?joined=1");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ";
    headers.set("Location", `/rider-join?msg=${encodeURIComponent(msg.slice(0, 120))}`);
  }
  return new Response(null, { status: 303, headers });
}
