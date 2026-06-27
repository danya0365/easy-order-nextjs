import { container } from "@/src/infrastructure/di/container";
import { logger } from "@/src/infrastructure/observability/logger";
import { getClientIp } from "@/src/presentation/lib/request-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8 * 1024;
/** Per-IP cap so a misbehaving client can't flood the logs / error tracker. */
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 5 * 60_000;

const clamp = (v: unknown, n: number): string | undefined =>
  typeof v === "string" && v.length > 0 ? v.slice(0, n) : undefined;

/**
 * Beacon endpoint for client-side errors (from the error boundaries). Forwards
 * the report to the server logger + error tracker so browser crashes are visible
 * in the same place as server errors. Public + unauthenticated by nature, so it
 * is rate-limited per IP and clamps the payload. Always returns quickly.
 */
export async function POST(req: Request): Promise<Response> {
  const ip = await getClientIp();
  const rl = await container.rateLimitRepository.hit(
    `client-error:${ip}`,
    RATE_LIMIT,
    RATE_WINDOW_MS,
  );
  if (!rl.allowed) return new Response(null, { status: 429 });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });

  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
  } catch {
    return new Response(null, { status: 400 });
  }

  // Reconstruct a synthetic Error so captureException forwards it to the tracker
  // exactly like a server error (with the client's stack/context attached).
  const err = new Error(clamp(body.message, 500) ?? "client error");
  const stack = clamp(body.stack, 4000);
  if (stack) err.stack = stack;
  logger.captureException(err, {
    scope: "client",
    digest: clamp(body.digest, 200),
    componentStack: clamp(body.componentStack, 4000),
    url: clamp(body.url, 500),
    ua: clamp(req.headers.get("user-agent"), 400),
    ip,
  });

  return new Response(null, { status: 204 });
}
