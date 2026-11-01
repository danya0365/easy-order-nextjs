/**
 * Shop contact & payment field rules (admin + owner forms). Pure.
 *
 * PromptPay target: Thai mobile (10 digits, starts with 0), national id /
 * tax id (13 digits, mod-11 checksum), or e-wallet id (15 digits).
 */

export const PROMPTPAY_INVALID_MESSAGE =
  "PromptPay ต้องเป็นเบอร์มือถือ (10 หลัก) เลขบัตรประชาชน/เลขผู้เสียภาษี (13 หลัก) หรือ e-Wallet (15 หลัก)";

/** Thai 13-digit citizen / tax id checksum (same algorithm for both). */
export function isValidThaiId13(digits: string): boolean {
  if (!/^\d{13}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(digits[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(digits[12]);
}

export type PromptPayKind = "mobile" | "id13" | "ewallet";

export function promptPayKind(digits: string): PromptPayKind | null {
  if (/^0[689]\d{8}$/.test(digits)) return "mobile";
  if (isValidThaiId13(digits)) return "id13";
  if (/^\d{15}$/.test(digits)) return "ewallet";
  return null;
}

/** Normalize a PromptPay target → digits, or null when blank. Throws when invalid. */
export function normalizePromptPayTarget(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  if (/[^0-9\s-]/.test(v)) throw new Error(PROMPTPAY_INVALID_MESSAGE);
  const digits = v.replace(/\D/g, "");
  if (!promptPayKind(digits)) throw new Error(PROMPTPAY_INVALID_MESSAGE);
  return digits;
}

/** Mask for display in admin lists: 081-xxx-5678 / 1-2345-xxxxx-xx-3. */
export function maskPromptPay(digits: string): string {
  if (digits.length <= 4) return digits;
  return `${"•".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

const MAX_URL = 300;

/**
 * LINE contact: accepts a full URL (line.me / lin.ee), an official account id
 * ("@shop"), or a personal id ("myid"). Returns a tappable https URL.
 */
export function normalizeLineContact(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  if (v.length > MAX_URL) throw new Error("LINE ยาวเกินไป");
  if (/^https?:\/\//i.test(v) || /^(line\.me|lin\.ee)\//i.test(v)) {
    const url = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    const host = safeHost(url);
    if (!host || !/(^|\.)(line\.me|lin\.ee)$/i.test(host)) {
      throw new Error("ลิงก์ LINE ต้องเป็น line.me หรือ lin.ee");
    }
    return url;
  }
  const official = v.startsWith("@");
  const id = official ? v.slice(1) : v;
  if (!/^[A-Za-z0-9._-]{2,40}$/.test(id)) throw new Error("LINE ID ไม่ถูกต้อง");
  return official
    ? `https://line.me/R/ti/p/@${encodeURIComponent(id)}`
    : `https://line.me/ti/p/~${encodeURIComponent(id)}`;
}

/** Facebook page URL (facebook.com / fb.com / fb.me / m.facebook.com). */
export function normalizeFacebookUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  if (v.length > MAX_URL) throw new Error("ลิงก์ยาวเกินไป");
  const url = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  const host = safeHost(url);
  if (!host || !/(^|\.)(facebook\.com|fb\.com|fb\.me)$/i.test(host)) {
    throw new Error("ลิงก์ Facebook ต้องเป็น facebook.com หรือ fb.me");
  }
  return url;
}

/** Public shop phone: digits only, 9–10 digits starting with 0. */
export function normalizeShopPhone(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const d = v.replace(/\D/g, "");
  if (!/^0\d{8,9}$/.test(d)) throw new Error("เบอร์โทรร้านไม่ถูกต้อง (9–10 หลัก ขึ้นต้นด้วย 0)");
  return d;
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
