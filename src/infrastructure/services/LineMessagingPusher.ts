import "server-only";

import type { IMessagePusher } from "@/src/application/services/IMessagePusher";
import { retry } from "@/src/infrastructure/services/retry";
import { logger } from "@/src/infrastructure/observability/logger";

export interface LineConfig {
  channelAccessToken: string;
  channelSecret: string;
}

/** Reads LINE Messaging API credentials from env; null if not fully configured. */
export function lineConfigFromEnv(): LineConfig | null {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelAccessToken || !channelSecret) return null;
  return { channelAccessToken, channelSecret };
}

const PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";

/** Push via the LINE Messaging API. Swallows errors (logs) so it never breaks a flow. */
export class LineMessagingPusher implements IMessagePusher {
  constructor(private readonly config: LineConfig) {}

  async pushText(channelUserId: string, text: string): Promise<void> {
    try {
      // Retry transient failures (network/timeout) — each attempt has its own
      // 5s timeout so it never blocks the triggering request for long. A non-ok
      // HTTP response is NOT retried (e.g. a 4xx auth/recipient error is permanent).
      const res = await retry(
        () =>
          fetch(PUSH_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.config.channelAccessToken}`,
            },
            body: JSON.stringify({
              to: channelUserId,
              messages: [{ type: "text", text }],
            }),
            signal: AbortSignal.timeout(5000),
          }),
        {
          retries: 2,
          baseDelayMs: 300,
          onRetry: (e, n) =>
            logger.warn("LINE push retry", {
              scope: "line",
              attempt: n,
              err: (e as Error).message,
            }),
        },
      );
      if (!res.ok) {
        logger.error("LINE push failed", {
          scope: "line",
          status: res.status,
          body: await res.text().catch(() => ""),
        });
      }
    } catch (e) {
      logger.captureException(e, { scope: "line", op: "pushText" });
    }
  }
}

/** No-op pusher used when LINE is not configured. */
export class NullMessagePusher implements IMessagePusher {
  async pushText(): Promise<void> {
    // Intentionally does nothing — in-app notifications still work.
  }
}
