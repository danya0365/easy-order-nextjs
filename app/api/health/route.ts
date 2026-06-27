import { sql } from "drizzle-orm";

import { db } from "@/src/infrastructure/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe for uptime monitors and load balancers. Pings the
 * database with a trivial query; reports app version. Returns 503 when the DB is
 * unreachable so external monitors can detect it. Exposes no secrets.
 */
export async function GET() {
  let dbUp = false;
  try {
    await db.get(sql`select 1`);
    dbUp = true;
  } catch {
    dbUp = false;
  }

  const body = {
    ok: dbUp,
    db: dbUp ? "up" : "down",
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
    time: new Date().toISOString(),
  };
  return Response.json(body, { status: dbUp ? 200 : 503 });
}
