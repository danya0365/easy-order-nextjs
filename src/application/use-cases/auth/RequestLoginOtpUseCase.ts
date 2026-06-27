import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";
import type { IMessagePusher } from "@/src/application/services/IMessagePusher";
import {
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS,
  generateOtp,
} from "./login-otp";
import { BRAND } from "@/src/config/brand";

export type RequestOtpResult =
  // OTP sent / on cooldown. passwordAllowed=false ⇒ linked owner/staff (must use
  // OTP); true ⇒ admin (keeps password as break-glass).
  | { status: "otp_sent"; passwordAllowed: boolean }
  | { status: "cooldown"; retryInSec: number; passwordAllowed: boolean }
  // Account uses password normally (unknown/inactive/unlinked, or linked admin
  // when LINE can't send) — caller shows the password step (no info leak).
  | { status: "use_password" }
  // Linked owner/staff but the server can't send OTP (LINE not configured) —
  // they can't use password either, so the caller offers "contact admin".
  | { status: "otp_unavailable" };

/**
 * Decides how an email signs in and (when applicable) sends a LINE OTP.
 * `lineConfigured` = whether the server can actually deliver OTP (LINE creds set).
 */
export class RequestLoginOtpUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly pusher: IMessagePusher,
  ) {}

  async execute(
    email: string,
    lineConfigured: boolean,
    now: number = Date.now(),
  ): Promise<RequestOtpResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.users.findByEmailWithSecret(normalizedEmail);
    // Unknown/inactive/unlinked → password path (generic, no leak).
    if (!user || !user.isActive || !user.lineUserId) {
      return { status: "use_password" };
    }

    // Linked. Owner/staff are OTP-only; admin keeps a password fallback.
    const passwordAllowed = user.role === "platform_admin";
    if (!lineConfigured) {
      // Can't deliver OTP. Admin can still use password; owner/staff are stuck
      // and must contact an admin.
      return passwordAllowed
        ? { status: "use_password" }
        : { status: "otp_unavailable" };
    }

    // Resend cooldown: only against a still-valid OTP (sentAt = expiry - TTL).
    const otp = await this.users.getLoginOtp(user.id);
    if (otp?.hash && otp.expiresAt) {
      const expiresMs = new Date(otp.expiresAt).getTime();
      if (expiresMs > now) {
        const nextAllowed = expiresMs - OTP_TTL_MS + RESEND_COOLDOWN_MS;
        if (now < nextAllowed) {
          return {
            status: "cooldown",
            retryInSec: Math.ceil((nextAllowed - now) / 1000),
            passwordAllowed,
          };
        }
      }
    }

    const code = generateOtp();
    const hash = await this.hasher.hash(code);
    const expiresAt = new Date(now + OTP_TTL_MS).toISOString();
    await this.users.setLoginOtp(user.id, hash, expiresAt);

    const minutes = Math.round(OTP_TTL_MS / 60_000);
    await this.pusher.pushText(
      user.lineUserId,
      `รหัสเข้าสู่ระบบ ${BRAND.name} ของคุณคือ ${code} (ใช้ได้ ${minutes} นาที)\nหากคุณไม่ได้พยายามเข้าสู่ระบบ โปรดอย่าบอกรหัสนี้กับผู้ใด`,
    );
    return { status: "otp_sent", passwordAllowed };
  }
}
