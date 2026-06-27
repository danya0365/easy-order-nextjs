import "server-only";

import { logger } from "@/src/infrastructure/observability/logger";

export interface TurnstileConfig {
  siteKey: string;
  secretKey: string;
}

/**
 * Reads Cloudflare Turnstile keys from env; null if not configured (CAPTCHA then
 * disabled — fine for local dev; set both keys in production to enforce it).
 * siteKey is public (NEXT_PUBLIC_) for the widget; secretKey is server-only.
 */
export function turnstileConfigFromEnv(): TurnstileConfig | null {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!siteKey || !secretKey) return null;
  return { siteKey, secretKey };
}

const VERIFY_ENDPOINT =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Verifies a Turnstile token server-side. No-op pass-through when unconfigured. */
export class TurnstileVerifier {
  constructor(private readonly config: TurnstileConfig | null) {}

  /** True when CAPTCHA is enforced (keys present). */
  get enabled(): boolean {
    return this.config !== null;
  }

  /** Returns true if the token is valid (or if CAPTCHA is disabled). */
  async verify(token: string | null | undefined, ip?: string): Promise<boolean> {
    if (!this.config) return true; // disabled → allow
    if (!token) return false;
    try {
      const body = new URLSearchParams({
        secret: this.config.secretKey,
        response: token,
      });
      if (ip && ip !== "unknown") body.set("remoteip", ip);
      const res = await fetch(VERIFY_ENDPOINT, { method: "POST", body });
      if (!res.ok) return false;
      const data = (await res.json()) as { success?: boolean };
      return data.success === true;
    } catch (e) {
      logger.captureException(e, { scope: "turnstile" });
      return false;
    }
  }
}
