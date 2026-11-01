/** One-page compact print menu (/s/[slug]/menu/print) — pure option + fit logic. */

export type CompactPaper = "A4" | "A3";
export type CompactOrient = "portrait" | "landscape";

export interface CompactOptions {
  paper: CompactPaper;
  orient: CompactOrient;
  cols: 2 | 3 | 4;
  thumbs: boolean;
  desc: boolean;
  footer: boolean;
}

export const COMPACT_DEFAULTS: CompactOptions = {
  paper: "A4",
  orient: "portrait",
  cols: 3,
  thumbs: false,
  desc: true,
  footer: true,
};

/** Printer margin on every side (mm). */
export const COMPACT_MARGIN_MM = 8;

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const bool = (v: string | undefined, d: boolean) => (v === "1" ? true : v === "0" ? false : d);

export function parseCompactOptions(sp: Raw): CompactOptions {
  const paper = one(sp.paper) === "A3" ? "A3" : "A4";
  const orient = one(sp.orient) === "landscape" ? "landscape" : "portrait";
  const n = Number.parseInt(one(sp.cols) ?? "", 10);
  const cols = (n === 2 || n === 3 || n === 4 ? n : COMPACT_DEFAULTS.cols) as 2 | 3 | 4;
  return {
    paper,
    orient,
    cols,
    thumbs: bool(one(sp.thumbs), COMPACT_DEFAULTS.thumbs),
    desc: bool(one(sp.desc), COMPACT_DEFAULTS.desc),
    footer: bool(one(sp.footer), COMPACT_DEFAULTS.footer),
  };
}

/** Query string for the options (defaults omitted → short shareable URLs). */
export function compactOptionsQuery(o: CompactOptions): string {
  const q = new URLSearchParams();
  if (o.paper !== COMPACT_DEFAULTS.paper) q.set("paper", o.paper);
  if (o.orient !== COMPACT_DEFAULTS.orient) q.set("orient", o.orient);
  if (o.cols !== COMPACT_DEFAULTS.cols) q.set("cols", String(o.cols));
  if (o.thumbs !== COMPACT_DEFAULTS.thumbs) q.set("thumbs", o.thumbs ? "1" : "0");
  if (o.desc !== COMPACT_DEFAULTS.desc) q.set("desc", o.desc ? "1" : "0");
  if (o.footer !== COMPACT_DEFAULTS.footer) q.set("footer", o.footer ? "1" : "0");
  return q.toString();
}

/** Physical sheet size in mm for paper + orientation. */
export function sheetSizeMm(paper: CompactPaper, orient: CompactOrient): { w: number; h: number } {
  const [s, l] = paper === "A3" ? [297, 420] : [210, 297];
  return orient === "landscape" ? { w: l, h: s } : { w: s, h: l };
}

/** Printable content box (sheet minus margins) in mm. */
export function contentSizeMm(paper: CompactPaper, orient: CompactOrient): { w: number; h: number } {
  const { w, h } = sheetSizeMm(paper, orient);
  return { w: w - 2 * COMPACT_MARGIN_MM, h: h - 2 * COMPACT_MARGIN_MM };
}

export const FIT_SCALES = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65] as const;
/** Smallest scale we accept to squeeze onto ONE sheet before allowing two. */
export const ONE_SHEET_MIN_SCALE = 0.75;

/**
 * Auto-fit: pick the largest type scale whose content fits one sheet (down to
 * ONE_SHEET_MIN_SCALE so it stays legible), else the largest that fits two
 * sheets, else the smallest scale. `measure(scale)` returns content height in
 * the same unit as `pageHeight`.
 */
export function pickFitScale(
  measure: (scale: number) => number,
  pageHeight: number,
): { scale: number; sheets: number } {
  for (const s of FIT_SCALES) {
    if (s < ONE_SHEET_MIN_SCALE) break;
    if (measure(s) <= pageHeight) return { scale: s, sheets: 1 };
  }
  for (const s of FIT_SCALES) {
    if (measure(s) <= pageHeight * 2) return { scale: s, sheets: 2 };
  }
  const min = FIT_SCALES[FIT_SCALES.length - 1];
  return { scale: min, sheets: Math.max(1, Math.ceil(measure(min) / pageHeight)) };
}
