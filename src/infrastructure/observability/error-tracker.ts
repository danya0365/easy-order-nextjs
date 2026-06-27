import "server-only";

import type { LogFields } from "@/src/application/services/ILogger";
import { retry } from "@/src/infrastructure/services/retry";

/** Destination that `logger.captureException()` forwards to. No-op by default. */
export interface ErrorTracker {
  capture(error: unknown, fields?: LogFields): void;
}

export const noopErrorTracker: ErrorTracker = { capture() {} };

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: `${error.name}: ${error.message}`, stack: error.stack };
  }
  return { message: typeof error === "string" ? error : JSON.stringify(error) };
}

/**
 * Generic webhook error reporter: POSTs a JSON payload to ERROR_WEBHOOK_URL
 * (Slack/Discord/any collector — vendor-neutral). Fire-and-forget and fail-soft,
 * so it never blocks or breaks the request path. Retries transient failures.
 *
 * To use a real APM later (e.g. Sentry), implement `ErrorTracker.capture` with
 * its SDK and select it in `createErrorTracker()` — nothing else changes.
 */
export function webhookErrorTracker(url: string): ErrorTracker {
  return {
    capture(error, fields) {
      const { message, stack } = describe(error);
      const body = JSON.stringify({
        text: `🛑 ${message}`,
        stack,
        env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
        ...fields,
      });
      void retry(
        async () => {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            signal: AbortSignal.timeout(3000),
          });
          if (!res.ok && (res.status >= 500 || res.status === 429)) {
            throw new Error(`error-webhook ${res.status}`);
          }
        },
        { retries: 2 },
      ).catch(() => {
        // Last-resort: the reporter itself failed. Don't recurse into capture.
        console.error("[error-tracker] failed to deliver report");
      });
    },
  };
}

/** Pick an error tracker from env: webhook when configured, else no-op. */
export function createErrorTracker(): ErrorTracker {
  const url = process.env.ERROR_WEBHOOK_URL;
  return url ? webhookErrorTracker(url) : noopErrorTracker;
}
