/**
 * Easy Order is a Halal-only platform: shops must not list non-Halal food/drink.
 * Keyword check on menu name + description (Thai + English).
 * False positives are preferred over allowing pork/alcohol through.
 */

/** Terms that indicate non-Halal menu content (case-insensitive). */
const NON_HALAL_PATTERNS: RegExp[] = [
  /หมู/,
  /แฮม/,
  /เบคอน/,
  /ไส้กรอก(?!\s*ไก่)/, // sausage unless explicitly chicken — still block plain ไส้กรอก
  /ไส้กรอก/,
  /ลาบหมู/,
  /กุนเชียง/,
  /แคปหมู/,
  /หนังหมู/,
  /พะโล้หมู/,
  /ขาหมู/,
  /ซี่โครงหมู/,
  /สามชั้น/,
  /เป็ดย่าง(?=.*หมู)|หมูยอ/,
  /หมูยอ/,
  /เบียร์/,
  /เหล้า/,
  /ไวน์/,
  /สาเก/,
  /สุรา/,
  /แอลกอฮอล/,
  /cocktail|ค็อกเทล/i,
  /\bpork\b/i,
  /\bham\b/i,
  /\bbacon\b/i,
  /\bbeer\b/i,
  /\bwine\b/i,
  /\balcohol\b/i,
  /\blard\b/i,
  /เจลลาติน(?!\s*ฮาลาล)/i, // gelatin unless marked Halal — block plain
];

export const HALAL_MENU_REJECT_MESSAGE =
  "Easy Order รับเฉพาะเมนูฮาลาล — ห้ามใส่หมู แฮม เบคอน ไส้กรอกหมู หรือเครื่องดื่มแอลกอฮอล์";

/** True if text looks non-Halal. */
export function isNonHalalMenuText(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  if (!t) return false;
  return NON_HALAL_PATTERNS.some((re) => re.test(t));
}

/** Throw if name or description fails Halal check. */
export function assertHalalMenuContent(
  name: string,
  description?: string | null,
): void {
  if (isNonHalalMenuText(name) || isNonHalalMenuText(description)) {
    throw new Error(HALAL_MENU_REJECT_MESSAGE);
  }
}
