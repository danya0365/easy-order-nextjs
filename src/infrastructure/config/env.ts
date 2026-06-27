import "server-only";

import { logger } from "@/src/infrastructure/observability/logger";

/** True in any production build (local `next start`, Vercel preview & prod). */
export const isProd = process.env.NODE_ENV === "production";

/**
 * Gate for DEV-ONLY conveniences that must NEVER reach a hosted environment —
 * most importantly the password-less login switcher.
 *
 * Enabled only on a developer's local machine:
 *   - NODE_ENV !== "production"  → excludes local prod builds (`next start`)
 *   - !process.env.VERCEL        → excludes ALL Vercel deployments (preview AND
 *                                  production both set NODE_ENV=production, but
 *                                  this is belt-and-suspenders: even a misconfig
 *                                  can't expose it on Vercel)
 *
 * Gate every dev-only surface AND its server action with this single flag.
 */
export const isDevLoginEnabled =
  process.env.NODE_ENV !== "production" && !process.env.VERCEL;

/**
 * DEV-ONLY 2FA bypass — skips the mandatory-2FA gate and the login TOTP
 * challenge so local testing isn't blocked by an authenticator code.
 *
 * Triple-gated and OPT-IN (off unless explicitly set):
 *   - NODE_ENV !== "production"      → excludes local prod builds
 *   - !process.env.VERCEL           → excludes ALL Vercel deployments
 *   - DEV_DISABLE_2FA === "true"     → must be set on purpose in .env.local
 *
 * NEVER weakens 2FA in any hosted environment, even if the var leaks.
 */
export const is2faBypassed =
  process.env.NODE_ENV !== "production" &&
  !process.env.VERCEL &&
  process.env.DEV_DISABLE_2FA === "true";

/**
 * Boot-time environment check (called from instrumentation.ts at server start —
 * NOT at build). Deliberately conservative to avoid breaking deploys:
 *
 *  - HARD FAIL only on a misconfiguration that silently corrupts production:
 *    a hosted deploy with no remote Turso URL would write to an ephemeral local
 *    file and lose data on every cold start. That must never ship.
 *  - Everything else is a WARN (logged once at boot) so a missing optional
 *    integration is visible without taking the app down.
 *
 * Extend the hard-fail set cautiously — a false positive takes prod offline.
 */
export function validateEnv(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Hosted = a real Vercel deploy. NOT a local `next build`/`next start`, which
  // also set NODE_ENV=production but legitimately use the local-file DB. (Same
  // gate as isDevLoginEnabled.) This keeps local prod builds from hard-failing.
  const hosted = !!process.env.VERCEL;
  const dbUrl = process.env.TURSO_DATABASE_URL;

  if (hosted) {
    if (!dbUrl) {
      errors.push(
        "TURSO_DATABASE_URL is required in production (or it falls back to an ephemeral local file → data loss).",
      );
    } else if (dbUrl.startsWith("file:")) {
      errors.push(
        `TURSO_DATABASE_URL points to a local file (${dbUrl}) in a hosted environment → data loss. Use the remote libsql:// URL.`,
      );
    } else if (!process.env.TURSO_AUTH_TOKEN) {
      warnings.push(
        "TURSO_AUTH_TOKEN is not set but a remote TURSO_DATABASE_URL is — remote Turso usually needs it.",
      );
    }

    if (!process.env.CRON_SECRET) {
      warnings.push("CRON_SECRET is not set — cron endpoints will reject all calls.");
    }
    if (!process.env.PROMPTPAY_TARGET) {
      warnings.push("PROMPTPAY_TARGET is not set — top-up payment QRs can't be generated.");
    }
  }

  // Group-consistency: if one var of an integration is set, require the rest.
  const r2 = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
  ];
  if (r2.some((k) => process.env[k]) && !r2.every((k) => process.env[k])) {
    warnings.push(
      `Partial R2 config — set all of ${r2.join(", ")} or none (uploads will fall back to local disk).`,
    );
  }
  const line = ["LINE_CHANNEL_ACCESS_TOKEN", "LINE_CHANNEL_SECRET"];
  if (line.some((k) => process.env[k]) && !line.every((k) => process.env[k])) {
    warnings.push(`Partial LINE config — set both ${line.join(" and ")} or neither.`);
  }
  const email = ["RESEND_API_KEY", "EMAIL_FROM"];
  if (email.some((k) => process.env[k]) && !email.every((k) => process.env[k])) {
    warnings.push(
      `Partial email config — set both ${email.join(" and ")} or neither (email notifications stay off).`,
    );
  }

  for (const w of warnings) logger.warn(w, { scope: "env" });
  if (errors.length > 0) {
    throw new Error(
      `[env] Invalid environment configuration:\n  - ${errors.join("\n  - ")}`,
    );
  }
}
