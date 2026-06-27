import { createHmac, timingSafeEqual } from "crypto";

import { container } from "@/src/infrastructure/di/container";
import { lineConfigFromEnv } from "@/src/infrastructure/services/LineMessagingPusher";
import { LinkLineAccountUseCase } from "@/src/application/use-cases/line/LinkLineAccountUseCase";
import { isLineLinkCodeShape } from "@/src/application/use-cases/line/GenerateLineLinkCodeUseCase";
import { BRAND } from "@/src/config/brand";
import { logger } from "@/src/infrastructure/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPLY_ENDPOINT = "https://api.line.me/v2/bot/message/reply";

/**
 * True for a unique-constraint violation. Drizzle wraps the driver error as
 * "Failed query: …", so the "UNIQUE constraint failed" text lives on the cause
 * chain, not the top-level message — walk it rather than testing `e.message`.
 */
function isUniqueViolation(e: unknown): boolean {
  let cur: unknown = e;
  for (let i = 0; i < 5 && cur instanceof Error; i++) {
    if (/UNIQUE/i.test(cur.message)) return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

function verifySignature(secret: string, raw: string, signature: string | null) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function reply(token: string, replyToken: string, text: string) {
  try {
    await fetch(REPLY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text }],
      }),
    });
  } catch (e) {
    logger.captureException(e, { scope: "line", op: "reply" });
  }
}

interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
}

/** Health check — lets you confirm the route is deployed and whether LINE env is set
 *  (no secrets exposed) by opening the URL in a browser. */
export async function GET() {
  return Response.json({ ok: true, lineConfigured: lineConfigFromEnv() !== null });
}

export async function POST(req: Request) {
  const config = lineConfigFromEnv();
  // Always 200 so LINE doesn't retry; do nothing if not configured.
  if (!config) return new Response("ok", { status: 200 });

  const raw = await req.text();
  if (!verifySignature(config.channelSecret, raw, req.headers.get("x-line-signature"))) {
    return new Response("bad signature", { status: 403 });
  }

  let events: LineEvent[] = [];
  try {
    events = (JSON.parse(raw).events ?? []) as LineEvent[];
  } catch {
    return new Response("ok", { status: 200 });
  }

  const linkUseCase = new LinkLineAccountUseCase(container.userRepository);

  for (const event of events) {
    // Isolate each event: one failure (e.g. a duplicate lineUserId hitting the
    // unique constraint) must not 500 the whole webhook and trigger LINE retries.
    try {
      const lineUserId = event.source?.userId;
      if (event.type === "message" && event.message?.type === "text" && lineUserId) {
        const text = (event.message.text ?? "").trim().toUpperCase();
        // Only treat a code-shaped message as a link attempt. Everything else is
        // ordinary chat — stay silent so the OA can be used for support Q&A
        // (a human or LINE's own auto-reply can handle it). Reply ONLY on a
        // successful link, so mistyped/used codes don't spam normal conversation.
        if (isLineLinkCodeShape(text)) {
          const linkedEmail = await linkUseCase.execute(text, lineUserId);
          if (linkedEmail && event.replyToken) {
            await reply(
              config.channelAccessToken,
              event.replyToken,
              `เชื่อมต่อสำเร็จ ✅ (${linkedEmail})\nจากนี้จะใช้ LINE นี้รับการแจ้งเตือนและรับรหัส OTP เข้าสู่ระบบ`,
            );
          }
        }
      } else if (event.type === "follow" && event.replyToken) {
        await reply(
          config.channelAccessToken,
          event.replyToken,
          `ขอบคุณที่เพิ่มเพื่อน 🎉\nพิมพ์โค้ดเชื่อมต่อจากแอป ${BRAND.name} เพื่อเชื่อมบัญชี (รับการแจ้งเตือน + เข้าสู่ระบบด้วย OTP)`,
        );
      }
    } catch (e) {
      logger.captureException(e, { scope: "line", op: "webhook-event" });
      if (event.replyToken) {
        // Only the unique-constraint case means "already linked elsewhere";
        // anything else is a generic error (don't leak linkage state).
        const alreadyLinked = isUniqueViolation(e);
        await reply(
          config.channelAccessToken,
          event.replyToken,
          alreadyLinked
            ? "เชื่อมต่อไม่สำเร็จ — LINE นี้ถูกผูกกับบัญชีอื่นแล้ว"
            : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
        );
      }
    }
  }

  return new Response("ok", { status: 200 });
}
