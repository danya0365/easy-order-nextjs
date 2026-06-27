import "server-only";

import { createHash } from "node:crypto";

import type { IPasswordBreachChecker } from "@/src/application/services/IPasswordBreachChecker";
import { retry } from "@/src/infrastructure/services/retry";

const RANGE_API = "https://api.pwnedpasswords.com/range/";

/**
 * HaveIBeenPwned "Pwned Passwords" via the k-anonymity range API: only the first
 * 5 hex chars of the SHA-1 are sent — the full password/hash never leaves the
 * server. Fails OPEN (returns false) on any network/parse error so an HIBP outage
 * can't block password changes.
 */
export class HibpPasswordBreachChecker implements IPasswordBreachChecker {
  async isBreached(password: string): Promise<boolean> {
    try {
      const sha1 = createHash("sha1")
        .update(password)
        .digest("hex")
        .toUpperCase();
      const prefix = sha1.slice(0, 5);
      const suffix = sha1.slice(5);
      // Retry transient failures (network/timeout, 5xx/429). A 4xx is permanent,
      // so we stop and fail open (null → false). The whole call also fails open.
      const body = await retry(
        async () => {
          const res = await fetch(`${RANGE_API}${prefix}`, {
            headers: { "Add-Padding": "true" },
            signal: AbortSignal.timeout(5000),
          });
          if (!res.ok) {
            if (res.status >= 500 || res.status === 429) {
              throw new Error(`hibp ${res.status}`);
            }
            return null;
          }
          return res.text();
        },
        { retries: 2 },
      );
      if (body == null) return false;
      for (const line of body.split("\n")) {
        const [hashSuffix, countStr] = line.trim().split(":");
        if (hashSuffix === suffix) {
          return Number(countStr) > 0;
        }
      }
      return false;
    } catch {
      return false; // fail open
    }
  }
}
