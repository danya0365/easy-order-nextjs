import "server-only";

import {
  type IEmailSender,
  type EmailMessage,
  nullEmailSender,
} from "@/src/application/services/IEmailSender";
import { retry } from "@/src/infrastructure/services/retry";

export interface EmailConfig {
  apiKey: string;
  /** Verified sender, e.g. `"Easy Stamp <no-reply@yourdomain.com>"`. */
  from: string;
}

/** Read the email config from env; null when not (fully) configured. */
export function emailConfigFromEnv(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  return apiKey && from ? { apiKey, from } : null;
}

/**
 * Transactional email via Resend's HTTP API (no SDK dependency — plain fetch,
 * mirroring the webhook error-tracker). Best-effort + fail-soft: a failed send
 * is logged and swallowed, never thrown, so it can't break the caller. Retries
 * transient (network / 5xx / 429) failures.
 *
 * To use a different provider (SES, Postmark, SMTP), implement `IEmailSender`
 * with its API and select it in `createEmailSender()` — nothing else changes.
 */
export class ResendEmailSender implements IEmailSender {
  constructor(private readonly config: EmailConfig) {}

  async send(message: EmailMessage): Promise<void> {
    const body = JSON.stringify({
      from: this.config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    });
    try {
      await retry(
        async () => {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.config.apiKey}`,
              "Content-Type": "application/json",
            },
            body,
            signal: AbortSignal.timeout(5000),
          });
          // Retry only transient failures; treat 4xx as permanent (bad request).
          if (!res.ok && (res.status >= 500 || res.status === 429)) {
            throw new Error(`resend ${res.status}`);
          }
        },
        { retries: 2 },
      );
    } catch {
      // Last resort — never throw from a best-effort send. Don't log the
      // recipient address (PII / clear-text logging).
      console.error("[email] failed to deliver");
    }
  }
}

/** Pick a sender from env: Resend when configured, else the no-op. */
export function createEmailSender(): IEmailSender {
  const cfg = emailConfigFromEnv();
  return cfg ? new ResendEmailSender(cfg) : nullEmailSender;
}
