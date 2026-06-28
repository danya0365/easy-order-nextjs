/**
 * Pure, deterministic logic for the promotional-poster studio (/shop/promote).
 *
 * One "promo goal" drives BOTH the ready-made template copy (path A) and the AI
 * image-generation prompt skeleton (path B), so a shop's promo stays on-concept
 * whichever path the owner picks. No I/O, no framework — just data → strings.
 *
 * Easy Order is in-store ordering: posters promote the SHOP + a QR to its public
 * page (`/s/<slug>`) and an optional owner-written highlight line — NOT a stamp
 * reward (the Easy Stamp original built copy around "collect N stamps → reward").
 */

/** The marketing intent the owner is creating a poster for. */
export type PromoGoal =
  | "new_customer" // ดึงลูกค้าใหม่
  | "signature_menu" // ชูเมนูเด่น
  | "festival" // เทศกาล / วันสำคัญ
  | "weekday_boost" // กระตุ้นยอดวันธรรมดา
  | "reopen_news"; // เปิดใหม่ / ข่าวสารร้าน

/** Output sizes the studio can export. Pixel dims are the exported PNG size. */
export type PosterSize = "ig_square" | "story_9x16" | "a4_print" | "table_tent";

export interface PosterDimensions {
  id: PosterSize;
  labelKey: "sizeIgSquare" | "sizeStory" | "sizeA4" | "sizeTableTent";
  w: number;
  h: number;
  /** Human aspect phrase fed into the AI prompt (path B). */
  aspectPhrase: string;
}

export const POSTER_SIZES: readonly PosterDimensions[] = [
  { id: "ig_square", labelKey: "sizeIgSquare", w: 1080, h: 1080, aspectPhrase: "square 1:1 aspect ratio" },
  { id: "story_9x16", labelKey: "sizeStory", w: 1080, h: 1920, aspectPhrase: "vertical 9:16 aspect ratio" },
  { id: "a4_print", labelKey: "sizeA4", w: 1240, h: 1754, aspectPhrase: "A4 portrait poster, roughly 3:4 aspect ratio" },
  { id: "table_tent", labelKey: "sizeTableTent", w: 1004, h: 1417, aspectPhrase: "tall A5 table-tent card, portrait" },
];

export function getPosterSize(id: PosterSize): PosterDimensions {
  const size = POSTER_SIZES.find((s) => s.id === id);
  if (!size) throw new Error(`Unknown poster size: ${id}`);
  return size;
}

export interface PromoGoalPreset {
  goal: PromoGoal;
  labelKey:
    | "goalNewCustomer"
    | "goalSignatureMenu"
    | "goalFestival"
    | "goalWeekdayBoost"
    | "goalReopenNews";
  hint: string;
  /** Path A — hero copy (may contain {shopName}). */
  headline: string;
  /** Path A — default supporting line (used when the owner leaves the highlight blank). */
  subcopyDefault: string;
  /** Path A — reassurance line above the QR. */
  valueLine: string;
  /** Path B — LOCKED mood segment of the AI prompt. */
  promptMood: string;
  /** Path B — EDITABLE default "vibe/detail" the owner can tweak. */
  promptVibeSeed: string;
}

/**
 * The five presets. Marketing CONTENT (Thai by design — a clone rewrites it like
 * the privacy/tutorial prose). Reflects how Easy Order works: customers order at
 * the in-store tablet; the QR opens the shop's public page.
 */
export const PROMO_GOAL_PRESETS: readonly PromoGoalPreset[] = [
  {
    goal: "new_customer",
    labelKey: "goalNewCustomer",
    hint: "ชวนลูกค้าใหม่มาลองร้าน",
    headline: "แวะชิมที่ {shopName}",
    subcopyDefault: "เมนูอร่อย พร้อมเสิร์ฟทุกวัน",
    valueLine: "สแกน QR ดูร้าน แล้วสั่งที่เคาน์เตอร์ได้เลย",
    promptMood: "warm, welcoming, friendly mood",
    promptVibeSeed: "ภาพอาหารน่ากิน บรรยากาศร้านอบอุ่นเป็นมิตร",
  },
  {
    goal: "signature_menu",
    labelKey: "goalSignatureMenu",
    hint: "ชูเมนูเด่น/ซิกเนเจอร์",
    headline: "ของเด่นต้องลอง ที่ {shopName}",
    subcopyDefault: "เมนูแนะนำของร้าน",
    valueLine: "สแกน QR ดูเมนูทั้งหมด แล้วสั่งที่ร้าน",
    promptMood: "appetizing, premium, eye-catching mood",
    promptVibeSeed: "เมนูซิกเนเจอร์เด่นกลางภาพ ดูน่ารับประทาน แสงสวย",
  },
  {
    goal: "festival",
    labelKey: "goalFestival",
    hint: "โปรช่วงเทศกาล",
    headline: "ฉลองเทศกาลกับ {shopName}",
    subcopyDefault: "เมนูพิเศษช่วงเทศกาล",
    valueLine: "สแกน QR ดูร้าน แล้วสั่งที่เคาน์เตอร์ได้เลย",
    promptMood: "festive, celebratory, vibrant mood",
    promptVibeSeed: "บรรยากาศเทศกาล โทนสีสดใส มีของตกแต่งตามฤดูกาล",
  },
  {
    goal: "weekday_boost",
    labelKey: "goalWeekdayBoost",
    hint: "เพิ่มลูกค้าวันคนน้อย",
    headline: "วันธรรมดาแวะ {shopName}",
    subcopyDefault: "นั่งชิล อิ่มอร่อย",
    valueLine: "สแกน QR ดูร้าน แล้วสั่งที่เคาน์เตอร์ได้เลย",
    promptMood: "relaxed, cozy, easygoing mood",
    promptVibeSeed: "ภาพสบายๆ ผ่อนคลายกลางสัปดาห์ บรรยากาศนั่งชิล",
  },
  {
    goal: "reopen_news",
    labelKey: "goalReopenNews",
    hint: "ประกาศข่าว เปิดร้าน/สาขาใหม่",
    headline: "{shopName} เปิดแล้ว!",
    subcopyDefault: "มาชิมกันได้เลยวันนี้",
    valueLine: "สแกน QR ดูร้านและเมนูได้เลย",
    promptMood: "fresh, exciting, announcement mood",
    promptVibeSeed: "ภาพประกาศข่าว สดใหม่ น่าตื่นเต้น ดูเป็นทางการนิดๆ",
  },
];

export function getPromoPreset(goal: PromoGoal): PromoGoalPreset {
  const preset = PROMO_GOAL_PRESETS.find((p) => p.goal === goal);
  if (!preset) throw new Error(`Unknown promo goal: ${goal}`);
  return preset;
}

/** Shop facts available to fill template copy and seed AI prompts. */
export interface PromoCopyContext {
  shopName: string;
  /** Owner-written highlight line (e.g. "ลด 10% เมนูใหม่"), or empty. */
  highlight: string;
}

/** Replace {shopName}/{highlight} placeholders with shop data. */
function fill(template: string, ctx: PromoCopyContext): string {
  return template
    .replaceAll("{shopName}", ctx.shopName)
    .replaceAll("{highlight}", ctx.highlight);
}

export interface TemplateCopy {
  headline: string;
  subcopy: string;
  valueLine: string;
}

/** Path A: resolve a preset's copy block against the shop's data. */
export function buildTemplateCopy(
  goal: PromoGoal,
  ctx: PromoCopyContext,
): TemplateCopy {
  const preset = getPromoPreset(goal);
  const highlight = ctx.highlight.trim();
  return {
    headline: fill(preset.headline, ctx),
    // The owner's highlight wins; otherwise the goal's default supporting line.
    subcopy: highlight || fill(preset.subcopyDefault, ctx),
    valueLine: fill(preset.valueLine, ctx),
  };
}

export interface PromptSegments {
  locked: { style: string; mood: string; noText: string; aspect: string };
  editable: { subject: string; vibe: string };
}

const LOCKED_STYLE =
  "professional marketing poster background, clean composition, high detail, photorealistic, soft studio lighting";

const LOCKED_NO_TEXT =
  "no text, no letters, no words, no logos, no garbled typography; leave clear empty space in the lower third for an overlay";

/** Path B: build the segmented prompt from goal + shop data + target size. */
export function buildAiPromptSegments(
  goal: PromoGoal,
  ctx: PromoCopyContext,
  size: PosterSize,
): PromptSegments {
  const preset = getPromoPreset(goal);
  const dims = getPosterSize(size);
  return {
    locked: {
      style: LOCKED_STYLE,
      mood: preset.promptMood,
      noText: LOCKED_NO_TEXT,
      aspect: dims.aspectPhrase,
    },
    editable: {
      subject: `ภาพสำหรับร้าน "${ctx.shopName}" — ใส่รายละเอียดอาหาร/บรรยากาศที่ต้องการ`,
      vibe: preset.promptVibeSeed,
    },
  };
}

/** Flatten segments into the final prompt string the owner copies to an AI tool. */
export function composeAiPrompt(segments: PromptSegments): string {
  const { locked, editable } = segments;
  return [
    editable.subject.trim(),
    editable.vibe.trim(),
    locked.style,
    locked.mood,
    locked.aspect,
    locked.noText,
  ]
    .filter((part) => part.length > 0)
    .join(", ");
}
