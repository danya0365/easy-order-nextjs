import "server-only";

import { DrizzleUserRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleUserRepository";
import { DrizzleSessionRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleSessionRepository";
import { DrizzleSubscriptionRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleSubscriptionRepository";
import { DrizzlePaymentRepository } from "@/src/infrastructure/repositories/drizzle/DrizzlePaymentRepository";
import { DrizzleTopupTransactionRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleTopupTransactionRepository";
import { DrizzleNotificationRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleNotificationRepository";
import { DrizzleContactRequestRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleContactRequestRepository";
import { DrizzleRateLimitRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleRateLimitRepository";
import { DrizzleAuditLogRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleAuditLogRepository";

import { BcryptPasswordHasher } from "@/src/infrastructure/services/BcryptPasswordHasher";
import { CryptoTotpService } from "@/src/infrastructure/services/CryptoTotpService";
import { HibpPasswordBreachChecker } from "@/src/infrastructure/services/HibpPasswordBreachChecker";
import {
  TurnstileVerifier,
  turnstileConfigFromEnv,
} from "@/src/infrastructure/services/TurnstileVerifier";
import { isProd } from "@/src/infrastructure/config/env";
import { ManualSlipPaymentVerifier } from "@/src/infrastructure/services/ManualSlipPaymentVerifier";
import { LocalSlipStorage } from "@/src/infrastructure/services/LocalSlipStorage";
import {
  R2SlipStorage,
  r2ConfigFromEnv,
} from "@/src/infrastructure/services/R2SlipStorage";
import {
  LineMessagingPusher,
  NullMessagePusher,
  lineConfigFromEnv,
} from "@/src/infrastructure/services/LineMessagingPusher";
import { createGeocoder } from "@/src/infrastructure/services/OsmGeocoder";
import { createEmailSender } from "@/src/infrastructure/services/ResendEmailSender";
import { NotificationService } from "@/src/application/services/NotificationService";
import { AuditLogger } from "@/src/application/services/AuditLogger";
import { LoginSecurityService } from "@/src/application/services/LoginSecurityService";
import { SensitiveActionGuard } from "@/src/application/services/SensitiveActionGuard";

import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { ISessionRepository } from "@/src/application/repositories/ISessionRepository";
import type { ISubscriptionRepository } from "@/src/application/repositories/ISubscriptionRepository";
import type { IPaymentRepository } from "@/src/application/repositories/IPaymentRepository";
import type { ITopupTransactionRepository } from "@/src/application/repositories/ITopupTransactionRepository";
import type { INotificationRepository } from "@/src/application/repositories/INotificationRepository";
import type { IContactRequestRepository } from "@/src/application/repositories/IContactRequestRepository";
import type { IRateLimitRepository } from "@/src/application/repositories/IRateLimitRepository";
import type { IAuditLogRepository } from "@/src/application/repositories/IAuditLogRepository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";
import type { ITotpService } from "@/src/application/services/ITotpService";
import type { IPasswordBreachChecker } from "@/src/application/services/IPasswordBreachChecker";
import type { IPaymentVerifier } from "@/src/application/services/IPaymentVerifier";
import type { ISlipStorage } from "@/src/application/services/ISlipStorage";
import type { IMessagePusher } from "@/src/application/services/IMessagePusher";
import type { IGeocoder } from "@/src/application/services/IGeocoder";
import type { IEmailSender } from "@/src/application/services/IEmailSender";
import type { ILogger } from "@/src/application/services/ILogger";
import { logger } from "@/src/infrastructure/observability/logger";

/** R2 in any environment that configures it (prod/Vercel); local disk otherwise. */
function createSlipStorage(): ISlipStorage {
  const r2 = r2ConfigFromEnv();
  return r2 ? new R2SlipStorage(r2) : new LocalSlipStorage();
}

/** LINE pusher when credentials are configured; a no-op pusher otherwise. */
function createMessagePusher(): IMessagePusher {
  const line = lineConfigFromEnv();
  return line ? new LineMessagingPusher(line) : new NullMessagePusher();
}

/**
 * Turnstile CAPTCHA. Fail-open when unconfigured (honeypot + rate-limit still
 * guard the public form) — but warn once in production so a missing key isn't
 * silent.
 */
function createTurnstile(): TurnstileVerifier {
  const cfg = turnstileConfigFromEnv();
  if (!cfg && isProd) {
    logger.warn(
      "Turnstile NOT configured in production — the public contact form has no CAPTCHA (honeypot + rate-limit only). Set NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY to enable it.",
      { scope: "turnstile" },
    );
  }
  return new TurnstileVerifier(cfg);
}

/**
 * The **product-agnostic** composition root: account/auth, billing (prepaid
 * day-topup), notifications, audit, rate-limit, payments/slip, and the shared
 * services. A clone keeps this file as-is and only edits the domain repos in
 * `container.ts` (which extends this). Swap a generic implementation here (e.g.
 * an auto-verify PaymentVerifier) without touching use cases — see FORKING.md.
 */
export class GenericContainer {
  // --- 🟢 generic repositories ---
  readonly userRepository: IUserRepository = new DrizzleUserRepository();
  readonly sessionRepository: ISessionRepository =
    new DrizzleSessionRepository();
  readonly subscriptionRepository: ISubscriptionRepository =
    new DrizzleSubscriptionRepository();
  readonly paymentRepository: IPaymentRepository =
    new DrizzlePaymentRepository();
  readonly topupTransactionRepository: ITopupTransactionRepository =
    new DrizzleTopupTransactionRepository();
  readonly notificationRepository: INotificationRepository =
    new DrizzleNotificationRepository();
  readonly contactRequestRepository: IContactRequestRepository =
    new DrizzleContactRequestRepository();
  readonly rateLimitRepository: IRateLimitRepository =
    new DrizzleRateLimitRepository();
  readonly auditLogRepository: IAuditLogRepository =
    new DrizzleAuditLogRepository();

  // --- 🟢 generic services ---
  readonly passwordHasher: IPasswordHasher = new BcryptPasswordHasher();
  readonly totp: ITotpService = new CryptoTotpService();
  readonly passwordBreachChecker: IPasswordBreachChecker =
    new HibpPasswordBreachChecker();
  readonly paymentVerifier: IPaymentVerifier = new ManualSlipPaymentVerifier();
  readonly slipStorage: ISlipStorage = createSlipStorage();
  readonly messagePusher: IMessagePusher = createMessagePusher();
  readonly turnstile: TurnstileVerifier = createTurnstile();
  readonly geocoder: IGeocoder = createGeocoder();
  readonly emailSender: IEmailSender = createEmailSender();

  readonly logger: ILogger = logger;
  readonly notificationService: NotificationService = new NotificationService(
    this.notificationRepository,
    this.userRepository,
    this.messagePusher,
    this.logger,
    this.emailSender,
  );
  readonly auditLogger: AuditLogger = new AuditLogger(
    this.auditLogRepository,
    this.logger,
  );
  readonly loginSecurity: LoginSecurityService = new LoginSecurityService(
    this.userRepository,
    this.auditLogRepository,
    this.auditLogger,
    this.notificationService,
  );
  readonly sensitiveActionGuard: SensitiveActionGuard = new SensitiveActionGuard(
    this.rateLimitRepository,
    this.auditLogger,
    this.notificationService,
  );
}
