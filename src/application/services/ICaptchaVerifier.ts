/**
 * Verifies a human-challenge token (e.g. Cloudflare Turnstile) server-side.
 * Implementations should fail-open when unconfigured so local dev keeps working.
 */
export interface ICaptchaVerifier {
  /** True if the token is valid (or if CAPTCHA is disabled). */
  verify(token: string | null | undefined, ip?: string): Promise<boolean>;
}
