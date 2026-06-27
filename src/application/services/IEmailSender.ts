/**
 * Sends a transactional email. Vendor-neutral: the concrete sender (Resend,
 * SES, SMTP, …) is wired in the DI container. Like {@link IMessagePusher},
 * implementations MUST be best-effort and never throw for a single failed send
 * — a notification/receipt failing must not break the triggering business flow.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain-text body (always required — the safe fallback). */
  text: string;
  /** Optional HTML body; senders fall back to `text` when absent. */
  html?: string;
}

export interface IEmailSender {
  send(message: EmailMessage): Promise<void>;
}

/** No-op sender — the default until an email provider is configured. */
export const nullEmailSender: IEmailSender = {
  async send() {},
};
