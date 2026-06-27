import type { IRateLimitRepository } from "@/src/application/repositories/IRateLimitRepository";
import type { AuditLogger } from "@/src/application/services/AuditLogger";
import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import type { NotificationService } from "@/src/application/services/NotificationService";

export interface VelocityCheck {
  /** Unique throttle key, e.g. `stamp_add:${shopId}:${userId}`. */
  key: string;
  limit: number;
  windowMs: number;
  /** Tenant scope for the audit/alert, when applicable. */
  shopId?: string | null;
  actorUserId?: string | null;
  ip?: string | null;
  /** Admin alert copy shown when the threshold is crossed. */
  alertTitle: string;
  alertBody: string;
  metadata?: Record<string, unknown>;
}

/**
 * Generic abuse/velocity guard for sensitive domain actions (e.g. issuing
 * loyalty stamps). When an action exceeds its allowed rate it is blocked AND —
 * exactly once per window — an audit event is written and platform admins are
 * alerted. Domains plug in their own action + thresholds; nothing here is
 * loyalty-specific.
 */
export class SensitiveActionGuard {
  constructor(
    private readonly rateLimit: IRateLimitRepository,
    private readonly auditLogger: AuditLogger,
    private readonly notifications: NotificationService,
  ) {}

  /** Returns `{ allowed }`. On a breach, fires the audit + admin alert once. */
  async check(c: VelocityCheck): Promise<{ allowed: boolean }> {
    const rl = await this.rateLimit.hit(c.key, c.limit, c.windowMs);
    if (rl.allowed) return { allowed: true };

    // Breached. Alert only on the first breach of this window (dedup via a
    // 1-per-window companion key) so a hammering attacker doesn't spam admins.
    const first = await this.rateLimit.hit(`alert:${c.key}`, 1, c.windowMs);
    if (first.allowed) {
      await this.auditLogger.record({
        action: AUDIT_ACTIONS.abuseVelocityTripped,
        actorUserId: c.actorUserId ?? null,
        shopId: c.shopId ?? null,
        ip: c.ip ?? null,
        metadata: { key: c.key, limit: c.limit, ...c.metadata },
      });
      await this.notifications.notifyAdmins({
        type: "security_alert",
        title: c.alertTitle,
        body: c.alertBody,
        linkUrl: "/admin/security",
      });
      // Also tell the shop owner — it's their shop being abused.
      if (c.shopId) {
        await this.notifications.notifyShopOwner(c.shopId, {
          type: "security_alert",
          title: c.alertTitle,
          body: c.alertBody,
          linkUrl: "/shop/security",
        });
      }
    }
    return { allowed: false };
  }
}
