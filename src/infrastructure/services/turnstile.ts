import "server-only";

import { TurnstileVerifier } from "./TurnstileVerifier";

/**
 * Static-QR register form Turnstile. Enabled only when a site key
 * (TURNSTILE_SITE_KEY or NEXT_PUBLIC_TURNSTILE_SITE_KEY) AND
 * TURNSTILE_SECRET_KEY are present; otherwise skipped gracefully (logged).
 */
function config() {
  const siteKey =
    process.env.TURNSTILE_SITE_KEY || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  return siteKey && secretKey ? { siteKey, secretKey } : null;
}

export function staticJoinTurnstileSiteKey(): string | null {
  return config()?.siteKey ?? null;
}

export async function verifyStaticJoinTurnstile(
  token: string | null | undefined,
  ip: string | null,
): Promise<boolean> {
  const cfg = config();
  if (!cfg) {
    console.info("[turnstile] static-join: keys not configured — skipping");
    return true;
  }
  return new TurnstileVerifier(cfg).verify(token, ip ?? undefined);
}
