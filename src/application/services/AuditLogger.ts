import type {
  CreateAuditLogInput,
  IAuditLogRepository,
} from "@/src/application/repositories/IAuditLogRepository";
import { type ILogger, noopLogger } from "@/src/application/services/ILogger";

/** Well-known audit action names (free-text column — these are just the canonical set). */
export const AUDIT_ACTIONS = {
  loginSucceeded: "login_succeeded",
  loginFailed: "login_failed",
  otpFailed: "otp_failed",
  accountLocked: "account_locked",
  passwordChanged: "password_changed",
  passwordResetByAdmin: "password_reset_by_admin",
  staffCreated: "staff_created",
  shopStatusChanged: "shop_status_changed",
  shopPaused: "shop_paused",
  shopResumed: "shop_resumed",
  paymentVerified: "payment_verified",
  sessionsRevoked: "sessions_revoked",
  forceLogout: "force_logout",
  impersonationStarted: "impersonation_started",
  impersonationStopped: "impersonation_stopped",
  abuseVelocityTripped: "abuse_velocity_tripped",
  twoFactorEnabled: "two_factor_enabled",
  twoFactorDisabled: "two_factor_disabled",
  twoFactorFailed: "two_factor_failed",
  twoFactorResetByAdmin: "two_factor_reset_by_admin",
  recoveryCodesRegenerated: "recovery_codes_regenerated",
  sessionRevoked: "session_revoked",
  kioskActivated: "kiosk_activated",
  kioskExited: "kiosk_exited",
  kioskPinSet: "kiosk_pin_set",
  orderPlaced: "order_placed",
  orderPaymentConfirmed: "order_payment_confirmed",
  orderCancelled: "order_cancelled",
  customerErased: "customer_erased",
  customerOnlineApproved: "customer_online_approved",
  customerOnlineRejected: "customer_online_rejected",
  staticJoinTokenRotated: "static_join_token_rotated",
  memberSignupPausedSet: "member_signup_paused_set",
  customerOnlineRejectedSuspicious: "customer_online_rejected_suspicious",
  customerPhoneBlocked: "customer_phone_blocked",
  memberSettingsUpdated: "member_settings_updated",
  shopSelfServiceSet: "shop_self_service_set",
  platformSettingsUpdated: "platform_settings_updated",
} as const;

/**
 * Records security/support events to the audit trail. Best-effort by design:
 * every call swallows its own error so a failed audit write never breaks the
 * triggering business flow (mirrors NotificationService).
 */
export class AuditLogger {
  constructor(
    private readonly repo: IAuditLogRepository,
    private readonly logger: ILogger = noopLogger,
  ) {}

  async record(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.repo.create(input);
    } catch (e) {
      this.logger.captureException(e, {
        scope: "audit",
        action: input.action,
      });
    }
  }
}
