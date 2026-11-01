import { container } from "@/src/infrastructure/di/container";
import { SaveRiderAvatarUseCase } from "@/src/application/use-cases/rider/RiderUseCases";
import { riderTokenFromRequest } from "@/src/infrastructure/auth/rider-session";

/** Cookie-auth profile photo upload (multipart, field "avatar"). JSON reply. */
export async function POST(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  const token = riderTokenFromRequest(req);
  if (!token) return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers });
  try {
    const file = (await req.formData()).get("avatar");
    if (!(file instanceof File)) throw new Error("ไม่พบไฟล์รูป");
    const rider = await new SaveRiderAvatarUseCase(container.riderRepository, container.slipStorage).execute(
      token,
      file.type,
      new Uint8Array(await file.arrayBuffer()),
    );
    return Response.json({ ok: true, avatarUrl: rider.avatarUrl }, { headers });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: 400, headers },
    );
  }
}
