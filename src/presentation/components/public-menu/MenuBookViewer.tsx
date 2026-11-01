"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { useTrackIndex } from "@/src/presentation/hooks/use-track-index";

/**
 * Menu book viewer — pure CSS scroll-snap flipbook (no library): one sheet at
 * a time, two side by side ≥1024px, native swipe on touch, Thai text stays
 * selectable. Sheets are server-rendered children. Styles: `.menubook*` in
 * public/styles/menu-book.css.
 */
export function MenuBookViewer({
  pageCount,
  children,
}: {
  pageCount: number;
  children: React.ReactNode;
}) {
  const t = useTranslations("publicMenu");
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(1);
  const { markSwiping } = useTrackIndex(trackRef, setIndex);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setPerView(mq.matches ? 2 : 1);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Jump to an absolute target (not scrollBy) so a half-finished swipe can't
  // make a button press snap back to the same sheet.
  const go = useCallback((dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const { pitch, perView: pv } = metrics(track);
    const from = Math.round(track.scrollLeft / pitch);
    const target = Math.max(0, Math.round(from / pv) * pv + dir * pv);
    track.scrollTo({ left: target * pitch, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const first = index + 1;
  const last = Math.min(index + perView, pageCount);
  const atStart = index <= 0;
  const atEnd = last >= pageCount;
  const label = last > first ? `${first}–${last}` : `${first}`;

  return (
    <div className="menubook print:hidden" data-testid="menu-book">
      <div className="menubook-stage">
        <div
          ref={trackRef}
          className="menubook-track"
          onTouchStart={markSwiping}
          onPointerDown={markSwiping}
          tabIndex={0}
          aria-roledescription="book"
        >
          {children}
        </div>
        <button type="button" onClick={() => go(-1)} disabled={atStart} aria-label={t("prevPage")} className="menubook-nav menubook-nav-prev">
          <ChevronLeft className="size-6" />
        </button>
        <button type="button" onClick={() => go(1)} disabled={atEnd} aria-label={t("nextPage")} className="menubook-nav menubook-nav-next">
          <ChevronRight className="size-6" />
        </button>
      </div>
      <div className="menubook-foot">
        <button type="button" onClick={() => go(-1)} disabled={atStart} className="menubook-btn" data-testid="book-prev">
          <ChevronLeft className="size-4" /> {t("prev")}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-center text-xs font-bold text-muted" aria-live="polite" data-testid="book-indicator">
            {t("pageOf", { page: label, total: pageCount })}
          </p>
          <div className="menubook-progress mt-1.5">
            <div
              className="menubook-progress-fill"
              // runtime progress width — not a design token
              style={{ width: `${Math.round((last / pageCount) * 100)}%` }}
            />
          </div>
        </div>
        <button type="button" onClick={() => go(1)} disabled={atEnd} className="menubook-btn" data-testid="book-next">
          {t("next")} <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function metrics(track: HTMLElement): { pitch: number; perView: number } {
  const first = track.children[0] as HTMLElement | undefined;
  const second = track.children[1] as HTMLElement | undefined;
  const pitch =
    (second && first ? second.offsetLeft - first.offsetLeft : first?.offsetWidth) ||
    track.clientWidth ||
    1;
  return { pitch, perView: Math.max(1, Math.round(track.clientWidth / pitch)) };
}
