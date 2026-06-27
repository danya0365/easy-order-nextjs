import type { ContactRequest } from "@/src/domain/entities";
import type { IContactRequestRepository } from "@/src/application/repositories/IContactRequestRepository";
import type { IRateLimitRepository } from "@/src/application/repositories/IRateLimitRepository";
import type { ICaptchaVerifier } from "@/src/application/services/ICaptchaVerifier";
import type { NotificationService } from "@/src/application/services/NotificationService";

export interface SubmitPublicContactRequestInput {
  email: string;
  subject: string;
  message: string;
  contactChannel: string;
  /** Client IP for the CAPTCHA check + per-IP rate-limit key. */
  ip: string;
  captchaToken: string;
}

// Unauthenticated form (login page) → abuse-guarded: CAPTCHA + per-IP rate-limit.
const PUBLIC_CONTACT_LIMIT = 3;
const PUBLIC_CONTACT_WINDOW_MS = 24 * 60 * 60_000; // 3 ครั้ง/วัน ต่อ IP

/**
 * Public (login-page) contact request — for users locked out of sign-in.
 * Validates CAPTCHA + rate-limit, records the request, and notifies admins.
 * (Honeypot + input shape are validated upstream in the action.)
 */
export class SubmitPublicContactRequestUseCase {
  constructor(
    private readonly captcha: ICaptchaVerifier,
    private readonly rateLimit: IRateLimitRepository,
    private readonly contacts: IContactRequestRepository,
    private readonly notifications: NotificationService,
  ) {}

  async execute(
    input: SubmitPublicContactRequestInput,
  ): Promise<ContactRequest> {
    const captchaOk = await this.captcha.verify(input.captchaToken, input.ip);
    if (!captchaOk) throw new Error("ยืนยันว่าไม่ใช่บอทไม่สำเร็จ กรุณาลองใหม่");

    const rl = await this.rateLimit.hit(
      `contact:ip:${input.ip}`,
      PUBLIC_CONTACT_LIMIT,
      PUBLIC_CONTACT_WINDOW_MS,
    );
    if (!rl.allowed) throw new Error("ส่งคำขอบ่อยเกินไป กรุณาลองใหม่ภายหลัง");

    const request = await this.contacts.create({
      source: "public",
      email: input.email.trim().toLowerCase(),
      ipAddress: input.ip,
      subject: input.subject,
      message: input.message,
      contactChannel: input.contactChannel,
    });

    await this.notifications.notifyAdmins({
      type: "contact_request",
      title: "ติดต่อผู้ดูแลจากหน้าเข้าสู่ระบบ",
      body: `${input.subject} — อีเมล: ${input.email} · ติดต่อกลับ: ${input.contactChannel}`,
      linkUrl: "/admin/contacts",
    });

    return request;
  }
}
