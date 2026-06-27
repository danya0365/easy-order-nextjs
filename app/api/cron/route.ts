import { timingSafeEqual } from "crypto";

import { logger } from "@/src/infrastructure/observability/logger";
import { CRON_JOBS, isJobEnabled } from "./jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Constant-time compare of the incoming bearer token against CRON_SECRET. */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Single cron dispatcher (one Vercel cron slot runs every job). Runs all enabled
 * jobs, or just one via `?job=<id>`. Each job is isolated so one failure doesn't
 * abort the rest. Guarded by CRON_SECRET (Vercel Cron sends it automatically).
 *
 * Upgrade path (multiple cron schedules): add `/api/cron?job=<id>` entries to
 * vercel.json on their own schedules and disable them from the run-all via env.
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const only = new URL(req.url).searchParams.get("job");
  if (only && !CRON_JOBS.some((j) => j.id === only)) {
    return Response.json({ error: `unknown job: ${only}` }, { status: 400 });
  }

  const selected = only
    ? CRON_JOBS.filter((j) => j.id === only)
    : CRON_JOBS;

  const ran: Array<{
    id: string;
    status: "ok" | "skipped" | "error";
    result?: unknown;
    error?: string;
  }> = [];

  for (const job of selected) {
    if (!isJobEnabled(job)) {
      ran.push({ id: job.id, status: "skipped" });
      continue;
    }
    try {
      const result = await job.run();
      ran.push({ id: job.id, status: "ok", result });
    } catch (e) {
      logger.captureException(e, { scope: "cron", job: job.id });
      ran.push({ id: job.id, status: "error", error: (e as Error).message });
    }
  }

  return Response.json({ ran });
}
