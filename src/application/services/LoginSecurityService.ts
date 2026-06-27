import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { IAuditLogRepository } from "@/src/application/repositories/IAuditLogRepository";
import type { AuditLogger } from "@/src/application/services/AuditLogger";
import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import type { NotificationService } from "@/src/application/services/NotificationService";

/** Lock an account after this many failed password logins within the window. */
export const LOCK_THRESHOLD = 8;
export const LOCK_WINDOW_MS = 15 * 60_000; // 15 นาที
/** Alert admins when an IP racks up this many failures in the window. */
export const IP_ALERT_THRESHOLD = 20;

export interface LoginAttemptContext {
  email: string;
  ip: string;
  userAgent: string | null;
  method: "password" | "line_otp";
}

/**
 * Account-level brute-force protection on top of the per-IP rate limit: records
 * failed logins to the audit trail, temporarily locks an account after too many
 * failures (counted from the audit trail — no extra column), and alerts admins
 * the moment a brute-force threshold is crossed. Best-effort on the alert path.
 */
export class LoginSecurityService {
  constructor(
    private readonly users: IUserRepository,
    private readonly audits: IAuditLogRepository,
    private readonly auditLogger: AuditLogger,
    private readonly notifications: NotificationService,
  ) {}

  /** Throws a generic error if the account for `email` is temporarily locked. */
  async assertNotLocked(email: string): Promise<void> {
    const user = await this.users.findByEmailWithSecret(email);
    if (!user) return; // unknown email — per-IP rate limit handles it
    const since = new Date(Date.now() - LOCK_WINDOW_MS).toISOString();
    const fails = await this.audits.countRecent(AUDIT_ACTIONS.loginFailed, since, {
      actorUserId: user.id,
    });
    if (fails >= LOCK_THRESHOLD) {
      throw new Error(
        "บัญชีนี้ถูกล็อกชั่วคราวจากการเข้าสู่ระบบผิดหลายครั้ง กรุณาลองใหม่ภายหลังหรือติดต่อผู้ดูแล",
      );
    }
  }

  /** Record a failed login + (once) alert admins when a brute-force threshold is crossed. */
  async recordFailure(ctx: LoginAttemptContext): Promise<void> {
    const user = await this.users.findByEmailWithSecret(ctx.email);
    await this.auditLogger.record({
      action: AUDIT_ACTIONS.loginFailed,
      actorUserId: user?.id ?? null,
      actorRole: user?.role ?? null,
      shopId: user?.shopId ?? null,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { email: ctx.email.toLowerCase(), method: ctx.method },
    });

    const since = new Date(Date.now() - LOCK_WINDOW_MS).toISOString();
    const byAccount = user
      ? await this.audits.countRecent(AUDIT_ACTIONS.loginFailed, since, {
          actorUserId: user.id,
        })
      : 0;
    const byIp = await this.audits.countRecent(AUDIT_ACTIONS.loginFailed, since, {
      ip: ctx.ip,
    });

    // Fire exactly once, on the attempt that crosses the threshold.
    const accountJustLocked = user && byAccount === LOCK_THRESHOLD;
    const ipJustFlagged = byIp === IP_ALERT_THRESHOLD;
    if (accountJustLocked || ipJustFlagged) {
      await this.auditLogger.record({
        action: AUDIT_ACTIONS.accountLocked,
        actorUserId: user?.id ?? null,
        shopId: user?.shopId ?? null,
        ip: ctx.ip,
        metadata: { email: ctx.email.toLowerCase(), byAccount, byIp },
      });
      await this.notifications.notifyAdmins({
        type: "security_alert",
        title: "⚠️ ตรวจพบการพยายามเข้าสู่ระบบผิดปกติ",
        body: accountJustLocked
          ? `บัญชี ${ctx.email} ใส่รหัสผิด ${byAccount} ครั้ง — ถูกล็อกชั่วคราว`
          : `IP ${ctx.ip} ใส่รหัสผิด ${byIp} ครั้งใน 15 นาที (อาจเป็น brute-force)`,
        linkUrl: "/admin/security",
      });
      // Also warn the account's owner directly (in-app + LINE) — it's their account.
      if (user) {
        const link =
          user.role === "platform_admin" ? "/admin/security" : "/shop/security";
        await this.notifications.notify(user.id, {
          type: "security_alert",
          title: "⚠️ บัญชีของคุณถูกพยายามเข้าสู่ระบบผิดปกติ",
          body: "มีการใส่รหัสผ่านผิดหลายครั้ง บัญชีถูกล็อกชั่วคราว — หากไม่ใช่คุณ โปรดเปลี่ยนรหัสผ่านทันที",
          linkUrl: link,
        });
      }
    }
  }
}
