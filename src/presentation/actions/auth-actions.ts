"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { container } from "@/src/infrastructure/di/container";
import { isDevLoginEnabled, is2faBypassed } from "@/src/infrastructure/config/env";
import {
  createSession,
  destroySession,
  forgetAccount,
  getSession,
  rememberAccount,
  requireRole,
  setPendingTwoFactor,
  getPendingTwoFactor,
  clearPendingTwoFactor,
} from "@/src/infrastructure/auth/session";
import { LoginUseCase } from "@/src/application/use-cases/auth/LoginUseCase";
import { ChangePasswordUseCase } from "@/src/application/use-cases/auth/ChangePasswordUseCase";
import { RequestLoginOtpUseCase } from "@/src/application/use-cases/auth/RequestLoginOtpUseCase";
import { VerifyLoginOtpUseCase } from "@/src/application/use-cases/auth/VerifyLoginOtpUseCase";
import { renderQrDataUrl } from "@/src/infrastructure/services/qr";
import { VerifyTwoFactorUseCase } from "@/src/application/use-cases/auth/VerifyTwoFactorUseCase";
import { BeginTwoFactorSetupUseCase } from "@/src/application/use-cases/auth/BeginTwoFactorSetupUseCase";
import { ConfirmTwoFactorSetupUseCase } from "@/src/application/use-cases/auth/ConfirmTwoFactorSetupUseCase";
import { DisableTwoFactorUseCase } from "@/src/application/use-cases/auth/DisableTwoFactorUseCase";
import { RegenerateRecoveryCodesUseCase } from "@/src/application/use-cases/auth/RegenerateRecoveryCodesUseCase";
import { lineConfigFromEnv } from "@/src/infrastructure/services/LineMessagingPusher";
import { getClientIp, getUserAgent } from "@/src/presentation/lib/request-ip";
import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import { formatDateTime } from "@/src/presentation/lib/format-date";
import type { User } from "@/src/domain/entities";
import { ROLE_HOME } from "@/src/domain/types/roles";

const loginSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

// IP-based throttles (per fixed window). Generous enough for real users, but
// stop OTP-bombing / password stuffing. Per-account OTP cooldown/attempts still apply.
const OTP_IP_LIMIT = 10;
const OTP_IP_WINDOW_MS = 10 * 60_000;
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 10 * 60_000;
// 2FA code-entry throttle. OTP-verify is already capped per-account
// (MAX_OTP_ATTEMPTS), but TOTP/recovery verification has no such counter — only
// the 5-min pending cookie — so cap guesses per pending user to stop brute-force.
const TWOFA_VERIFY_LIMIT = 8;
const TWOFA_VERIFY_WINDOW_MS = 10 * 60_000;

export interface LoginFormState {
  error?: string;
  /** Step 1 passed but the account has 2FA — UI should show the code step. */
  twoFactorRequired?: boolean;
}

/**
 * Finish a login after step-1 (password/OTP) succeeds. If the account has 2FA,
 * stash a short-lived pending marker and ask the UI for the code instead of
 * creating a session. Otherwise create the session and redirect.
 */
async function completeLogin(
  user: User,
  method: "password" | "line_otp",
  ip: string,
  userAgent: string | null,
): Promise<LoginFormState> {
  // DEV bypass: skip the TOTP challenge entirely (local testing only).
  if (user.totpEnabled && !is2faBypassed) {
    await setPendingTwoFactor(user.id);
    return { twoFactorRequired: true };
  }
  await container.auditLogger.record({
    actorUserId: user.id,
    actorRole: user.role,
    action: AUDIT_ACTIONS.loginSucceeded,
    shopId: user.shopId,
    ip,
    userAgent,
    metadata: { method },
  });
  await rememberAccount({ email: user.email, role: user.role });
  await createSession(user.id);
  await sendLoginAlert(user, method === "password" ? "รหัสผ่าน" : "LINE OTP");
  redirect(ROLE_HOME[user.role]);
}

/** Where the login UI should go next after the email step. */
export interface OtpRequestState {
  /** "otp" → OTP step · "password" → password step · "unavailable" → must use LINE but can't (offer contact admin). */
  next?: "otp" | "password" | "unavailable";
  /** OTP step only: whether to offer the "use password instead" fallback (admin yes; owner/staff no). */
  passwordAllowed?: boolean;
  error?: string;
}

/** Security alert pushed to the user's linked LINE after a successful sign-in. */
async function sendLoginAlert(user: User, method: string): Promise<void> {
  if (!user.lineUserId) return;
  try {
    await container.messagePusher.pushText(
      user.lineUserId,
      `🔐 เข้าสู่ระบบสำเร็จ\nเวลา ${formatDateTime(new Date().toISOString())} · วิธี: ${method}\nหากไม่ใช่คุณ โปรดติดต่อผู้ดูแลทันที`,
    );
  } catch {
    // Never block login on a push failure.
  }
}

/**
 * Step 1 of passwordless login: given an email, decide whether to send a LINE
 * OTP (linked account + LINE configured) or fall back to the password form.
 */
export async function requestLoginOtpAction(
  _prev: OtpRequestState,
  formData: FormData,
): Promise<OtpRequestState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!z.string().email().safeParse(email).success) {
    return { error: "อีเมลไม่ถูกต้อง" };
  }

  // IP rate-limit (anti OTP-bombing across many emails).
  const ip = await getClientIp();
  const rl = await container.rateLimitRepository.hit(
    `otp:ip:${ip}`,
    OTP_IP_LIMIT,
    OTP_IP_WINDOW_MS,
  );
  if (!rl.allowed) {
    return { error: `พยายามหลายครั้งเกินไป ลองใหม่ในอีก ${rl.retryAfterSec} วินาที` };
  }

  const result = await new RequestLoginOtpUseCase(
    container.userRepository,
    container.passwordHasher,
    container.messagePusher,
  ).execute(email, lineConfigFromEnv() !== null);

  if (result.status === "otp_sent") {
    return { next: "otp", passwordAllowed: result.passwordAllowed };
  }
  if (result.status === "cooldown") {
    return {
      next: "otp",
      passwordAllowed: result.passwordAllowed,
      error: `ขอรหัสใหม่ได้ในอีก ${result.retryInSec} วินาที`,
    };
  }
  if (result.status === "otp_unavailable") return { next: "unavailable" };
  return { next: "password" };
}

/** Step 2 of passwordless login: verify the OTP and start a session. */
export async function verifyLoginOtpAction(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const otp = String(formData.get("otp") ?? "").trim();
  if (!email || !otp) return { error: "กรุณากรอกรหัส OTP" };

  const ip = await getClientIp();
  const userAgent = await getUserAgent();
  let user;
  try {
    user = await new VerifyLoginOtpUseCase(
      container.userRepository,
      container.passwordHasher,
    ).execute(email, otp);
  } catch (e) {
    await container.auditLogger.record({
      action: AUDIT_ACTIONS.otpFailed,
      ip,
      userAgent,
      metadata: { email: email.toLowerCase(), reason: (e as Error).message },
    });
    return { error: (e as Error).message };
  }
  if (!user) {
    await container.auditLogger.record({
      action: AUDIT_ACTIONS.otpFailed,
      ip,
      userAgent,
      metadata: { email: email.toLowerCase(), reason: "invalid_or_expired" },
    });
    return { error: "รหัส OTP ไม่ถูกต้องหรือหมดอายุ" };
  }

  return completeLogin(user, "line_otp", ip, userAgent);
}

/** Step 3 (2FA-enabled accounts): verify the TOTP/recovery code → start session. */
export async function verifyLoginTwoFactorAction(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const code = String(formData.get("code") ?? "").trim();
  const userId = await getPendingTwoFactor();
  if (!userId) return { error: "หมดเวลายืนยันตัวตน กรุณาเข้าสู่ระบบใหม่" };

  // Throttle code guesses per pending user (brute-force defense for TOTP).
  const rl = await container.rateLimitRepository.hit(
    `2fa_verify:${userId}`,
    TWOFA_VERIFY_LIMIT,
    TWOFA_VERIFY_WINDOW_MS,
  );
  if (!rl.allowed) {
    return {
      error: `ใส่รหัสผิดหลายครั้งเกินไป ลองใหม่ในอีก ${rl.retryAfterSec} วินาที`,
      twoFactorRequired: true,
    };
  }

  const ip = await getClientIp();
  const userAgent = await getUserAgent();
  const user = await container.userRepository.findById(userId);
  const ok = user
    ? await new VerifyTwoFactorUseCase(
        container.userRepository,
        container.totp,
        container.passwordHasher,
      ).execute(userId, code)
    : false;

  if (!ok || !user) {
    await container.auditLogger.record({
      actorUserId: userId,
      action: AUDIT_ACTIONS.twoFactorFailed,
      ip,
      userAgent,
    });
    return { error: "รหัสยืนยันไม่ถูกต้อง", twoFactorRequired: true };
  }

  await clearPendingTwoFactor();
  await container.auditLogger.record({
    actorUserId: user.id,
    actorRole: user.role,
    action: AUDIT_ACTIONS.loginSucceeded,
    shopId: user.shopId,
    ip,
    userAgent,
    metadata: { method: "2fa" },
  });
  await rememberAccount({ email: user.email, role: user.role });
  await createSession(user.id);
  await sendLoginAlert(user, "2FA");
  redirect(ROLE_HOME[user.role]);
}

export async function loginAction(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  // IP+email rate-limit (anti password stuffing).
  const ip = await getClientIp();
  const userAgent = await getUserAgent();
  const rl = await container.rateLimitRepository.hit(
    `login:${ip}:${parsed.data.email.toLowerCase()}`,
    LOGIN_LIMIT,
    LOGIN_WINDOW_MS,
  );
  if (!rl.allowed) {
    return {
      error: `พยายามเข้าสู่ระบบหลายครั้งเกินไป ลองใหม่ในอีก ${rl.retryAfterSec} วินาที`,
    };
  }

  // Account-level lockout (brute-force protection across IPs).
  try {
    await container.loginSecurity.assertNotLocked(parsed.data.email);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const useCase = new LoginUseCase(
    container.userRepository,
    container.passwordHasher,
  );
  const user = await useCase.execute(parsed.data.email, parsed.data.password);
  if (!user) {
    await container.loginSecurity.recordFailure({
      email: parsed.data.email,
      ip,
      userAgent,
      method: "password",
    });
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  // completeLogin redirects (throws) on success, or returns a 2FA-required
  // state for accounts with two-factor enabled.
  return completeLogin(user, "password", ip, userAgent);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/** Remove a remembered account from this device's login switcher. */
export async function forgetAccountAction(email: string): Promise<void> {
  await forgetAccount(email);
}

export interface PasswordFormState {
  error?: string;
  success?: string;
}

/**
 * DEV ONLY — log in as any user without a password, for fast local testing.
 * Double-gated: this server action refuses to run unless `isDevLoginEnabled`
 * (local dev, never on Vercel), so it can never create a session in
 * preview/production even if called directly. Same flag gates the UI switcher.
 */
export async function devLoginAsAction(userId: string): Promise<void> {
  if (!isDevLoginEnabled) {
    throw new Error("Not available");
  }
  const user = await container.userRepository.findById(userId);
  if (!user || !user.isActive) {
    throw new Error("ผู้ใช้ไม่พร้อมใช้งาน");
  }
  await rememberAccount({ email: user.email, role: user.role });
  await createSession(user.id);
  redirect(ROLE_HOME[user.role]);
}

export interface TwoFactorSetupState {
  secret?: string;
  uri?: string;
  qrDataUrl?: string;
  recoveryCodes?: string[];
  error?: string;
  success?: string;
}

/** Admin begins 2FA enrollment — returns the secret + a QR data-URL to scan. */
export async function beginTwoFactorSetupAction(): Promise<TwoFactorSetupState> {
  const user = await requireRole("platform_admin");
  const { secret, uri } = await new BeginTwoFactorSetupUseCase(
    container.userRepository,
    container.totp,
  ).execute(user.id, user.email);
  const qrDataUrl = await renderQrDataUrl(uri);
  return { secret, uri, qrDataUrl };
}

/** Admin confirms 2FA with a code from their app — activates it + returns recovery codes. */
export async function confirmTwoFactorSetupAction(
  _prev: TwoFactorSetupState,
  formData: FormData,
): Promise<TwoFactorSetupState> {
  try {
    const user = await requireRole("platform_admin");
    const code = String(formData.get("code") ?? "").trim();
    const recoveryCodes = await new ConfirmTwoFactorSetupUseCase(
      container.userRepository,
      container.totp,
      container.passwordHasher,
    ).execute(user.id, code);
    await container.auditLogger.record({
      actorUserId: user.id,
      actorRole: user.role,
      action: AUDIT_ACTIONS.twoFactorEnabled,
      ip: await getClientIp(),
    });
    // NOTE: do NOT revalidatePath("/admin") here. Enrollment happens inside the
    // mandatory-2FA gate, which the (platform) layout renders only while
    // totpEnabled is false. Revalidating re-renders the layout with the now-true
    // totpEnabled, swapping the gate (and this recovery-codes screen) for the
    // /admin content mid-flow — the codes flash and vanish before the user can
    // save them. The panel's "ดำเนินการต่อ" button does a full window reload,
    // which refreshes the layout cleanly once the codes are saved.
    return { recoveryCodes, success: "เปิดใช้งาน 2FA แล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Admin regenerates recovery codes (invalidates the old set; needs the password). */
export async function regenerateRecoveryCodesAction(
  _prev: TwoFactorSetupState,
  formData: FormData,
): Promise<TwoFactorSetupState> {
  try {
    const user = await requireRole("platform_admin");
    const password = String(formData.get("password") ?? "");
    const recoveryCodes = await new RegenerateRecoveryCodesUseCase(
      container.userRepository,
      container.passwordHasher,
    ).execute(user.id, password);
    await container.auditLogger.record({
      actorUserId: user.id,
      actorRole: user.role,
      action: AUDIT_ACTIONS.recoveryCodesRegenerated,
      ip: await getClientIp(),
    });
    revalidatePath("/admin");
    return { recoveryCodes, success: "สร้างรหัสสำรองชุดใหม่แล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Admin turns off 2FA (must re-enter their password). */
export async function disableTwoFactorAction(
  _prev: TwoFactorSetupState,
  formData: FormData,
): Promise<TwoFactorSetupState> {
  try {
    const user = await requireRole("platform_admin");
    const password = String(formData.get("password") ?? "");
    await new DisableTwoFactorUseCase(
      container.userRepository,
      container.passwordHasher,
    ).execute(user.id, password);
    await container.auditLogger.record({
      actorUserId: user.id,
      actorRole: user.role,
      action: AUDIT_ACTIONS.twoFactorDisabled,
      ip: await getClientIp(),
    });
    // High-risk: tell every admin (compromise/insider signal).
    await container.notificationService.notifyAdmins({
      type: "security_alert",
      title: "⚠️ มีการปิด 2FA ของผู้ดูแลระบบ",
      body: `${user.email} ปิดการยืนยัน 2 ชั้นของบัญชีตัวเอง`,
      linkUrl: "/admin/security",
    });
    revalidatePath("/admin");
    return { success: "ปิด 2FA แล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Revoke one of MY active sessions by id (from the devices list). */
export async function revokeSessionAction(
  sessionId: string,
): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "กรุณาเข้าสู่ระบบใหม่" };
  await container.sessionRepository.deleteById(sessionId, user.id);
  await container.auditLogger.record({
    actorUserId: user.id,
    actorRole: user.role,
    action: AUDIT_ACTIONS.sessionRevoked,
    ip: await getClientIp(),
  });
  revalidatePath("/admin");
  return {};
}

/** Sign out of every OTHER device (keeps the current one). */
export async function signOutEverywhereAction(): Promise<{ error?: string; success?: string }> {
  const user = await getSession();
  if (!user) return { error: "กรุณาเข้าสู่ระบบใหม่" };
  await container.sessionRepository.deleteAllForUser(user.id);
  await createSession(user.id); // re-establish the current device
  await container.auditLogger.record({
    actorUserId: user.id,
    actorRole: user.role,
    action: AUDIT_ACTIONS.sessionsRevoked,
    shopId: user.shopId,
    ip: await getClientIp(),
    userAgent: await getUserAgent(),
  });
  return { success: "ออกจากระบบบนอุปกรณ์อื่นทั้งหมดแล้ว" };
}

/** Any logged-in user changes their own password (verifies the current one). */
export async function changeMyPasswordAction(
  _prev: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  try {
    const user = await getSession();
    if (!user) return { error: "กรุณาเข้าสู่ระบบใหม่" };

    const current = String(formData.get("currentPassword") ?? "");
    const next = String(formData.get("newPassword") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");
    if (next !== confirm) return { error: "รหัสผ่านใหม่และยืนยันไม่ตรงกัน" };

    await new ChangePasswordUseCase(
      container.userRepository,
      container.passwordHasher,
      container.sessionRepository,
      container.passwordBreachChecker,
    ).execute(user.id, current, next);

    // The use case revoked every session (incl. this one) — re-establish the
    // current device so the user stays signed in here while others are logged out.
    await createSession(user.id);
    await container.auditLogger.record({
      actorUserId: user.id,
      actorRole: user.role,
      action: AUDIT_ACTIONS.passwordChanged,
      shopId: user.shopId,
      ip: await getClientIp(),
      userAgent: await getUserAgent(),
    });

    return { success: "เปลี่ยนรหัสผ่านแล้ว — ออกจากระบบบนอุปกรณ์อื่นทั้งหมดแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
