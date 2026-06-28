import { container } from "@/src/infrastructure/di/container";
import { getSession } from "@/src/infrastructure/auth/session";

// Serves a lead's shop photo, gated to the platform admin only (leads are an
// admin-only CRM). GET is uncached by default in Next 16 (fine for a private file).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const user = await getSession();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (user.role !== "platform_admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { leadId } = await params;
  const lead = await container.leadRepository.findById(leadId);
  if (!lead || !lead.photoUrl) return new Response("Not found", { status: 404 });

  const file = await container.slipStorage.read(lead.photoUrl);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
