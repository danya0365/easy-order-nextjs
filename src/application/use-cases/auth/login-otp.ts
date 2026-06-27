import { customAlphabet } from "nanoid";

/** Shared config + generator for passwordless login OTPs (sent via LINE). */
export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60_000; // 5 นาที
export const RESEND_COOLDOWN_MS = 60_000; // ขอรหัสใหม่ได้ทุก 60 วินาที
export const MAX_OTP_ATTEMPTS = 5; // ใส่ผิดเกินจำนวนนี้ = ล็อก ต้องขอรหัสใหม่

const genDigits = customAlphabet("0123456789", OTP_LENGTH);

/** A fresh numeric OTP, e.g. "043917". */
export function generateOtp(): string {
  return genDigits();
}
