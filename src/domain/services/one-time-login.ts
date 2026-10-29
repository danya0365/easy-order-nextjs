import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Allowed lifetimes for an admin one-time login link (max 24h). */
export const ONE_TIME_LOGIN_EXPIRY = {
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "24h": 24 * 60 * 60_000,
} as const;
export type OneTimeLoginExpiry = keyof typeof ONE_TIME_LOGIN_EXPIRY;
export const DEFAULT_ONE_TIME_LOGIN_EXPIRY: OneTimeLoginExpiry = "15m";

export function isOneTimeLoginExpiry(v: unknown): v is OneTimeLoginExpiry {
  return typeof v === "string" && v in ONE_TIME_LOGIN_EXPIRY;
}

/** 32 random bytes, base64url (43 chars). */
export function generateOneTimeLoginToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOneTimeLoginToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Plausible token shape — rejects junk before touching the DB. */
export function isWellFormedToken(t: unknown): t is string {
  return typeof t === "string" && /^[A-Za-z0-9_-]{43}$/.test(t);
}

export function hashesEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** "somchai@gmail.com" → "so*****@gmail.com" */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const keep = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  return `${keep}${"*".repeat(Math.max(3, local.length - keep.length))}@${domain}`;
}

/** Why a one-time link can't be used (shown to the user; never leaks account data). */
export type OneTimeLinkInvalidReason =
  | "malformed"
  | "not_found"
  | "used"
  | "revoked"
  | "expired"
  | "no_account";

/**
 * Link-preview / unfurl bots (chat apps, social, search). They fetch the URL to
 * build a preview card; we render a neutral page for them without even looking
 * the token up. (Viewing never consumes anyway — this just keeps them out of
 * the lookup path and the probe throttle.) In-app browsers (Line/, FBAN, …)
 * are real users and are NOT matched.
 */
const PREVIEW_UA =
  /(facebookexternalhit|facebot|meta-externalagent|twitterbot|slackbot|slack-imgproxy|discordbot|telegrambot|whatsapp|linkedinbot|skypeuripreview|microsoftpreview|embedly|vkshare|pinterest(bot)?\/|redditbot|applebot|googlebot|bingbot|google-pagerenderer|iframely|outbrain|quora link preview|bitlybot|line-poker|linespider|mattermost|zoominfobot|viber|kakaotalk-scrap|yeti\/|yandexbot|duckduckbot|baiduspider|preview)/i;

export function isLinkPreviewUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return PREVIEW_UA.test(ua);
}

/**
 * CSRF policy for the one-time-link confirm POST. The token itself is the
 * secret, so login-CSRF is the only risk; we still refuse explicit cross-site
 * posts. `Origin: null` MUST be accepted: the page is served with
 * `Referrer-Policy: no-referrer`, and per the Fetch spec a native form POST
 * from such a page carries `Origin: null` (in-app browsers, pre-hydration taps).
 */
export function isAcceptableConfirmOrigin(input: {
  origin: string | null;
  host: string | null;
  secFetchSite: string | null;
}): boolean {
  if (input.secFetchSite === "cross-site") return false;
  const o = input.origin;
  if (!o || o === "null") return true;
  try {
    return new URL(o).host.toLowerCase() === (input.host ?? "").toLowerCase();
  } catch {
    return false;
  }
}
