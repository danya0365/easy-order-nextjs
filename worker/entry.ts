/**
 * Worker entry: the vinext app (fetch) plus a Cloudflare cron `scheduled`
 * handler. The cron re-enters the app through its own /api/cron route (same
 * CRON_SECRET bearer auth as an external caller), so jobs run inside the
 * normal request context (DB, env, memo) with no duplicated bootstrap.
 */
import app from "vinext/server/fetch-handler";

interface Env {
  CRON_SECRET?: string;
  [k: string]: unknown;
}

/** Cron expression → job id (see wrangler triggers in cloudflare.config.ts). */
const SCHEDULE_JOBS: Record<string, string> = {
  "5 * * * *": "credit-daily-settle",
};

type Handler = { fetch: (req: Request, env: Env, ctx: ExecutionContext) => Promise<Response> };
const inner = app as unknown as Handler;

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext) {
    return inner.fetch(req, env, ctx);
  },
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    const job = SCHEDULE_JOBS[event.cron];
    if (!job || !env.CRON_SECRET) {
      console.warn("[cron] skipped", event.cron, job ? "no CRON_SECRET" : "unmapped");
      return;
    }
    const req = new Request(`https://cron.internal/api/cron?job=${encodeURIComponent(job)}`, {
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });
    const res = await inner.fetch(req, env, ctx);
    console.log("[cron]", job, res.status, (await res.text()).slice(0, 500));
  },
};
