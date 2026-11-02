"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

/**
 * Current sheet index of a scroll-snap track — updated when a swipe ENDS (not
 * mid-swipe, which would flicker the indicator). iOS < 18 lacks `scrollend`, so
 * a 120ms scroll-idle timer is the fallback. Ported from ai-agent-academy.
 */
export function useTrackIndex(
  trackRef: RefObject<HTMLElement | null>,
  onChange: (index: number) => void,
): { markSwiping: () => void } {
  const swiping = useRef(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const done = () => {
      swiping.current = false;
      const first = track.children[0] as HTMLElement | undefined;
      const second = track.children[1] as HTMLElement | undefined;
      const pitch =
        (second && first ? second.offsetLeft - first.offsetLeft : first?.offsetWidth) ||
        track.clientWidth ||
        1;
      onChange(Math.round(track.scrollLeft / pitch));
    };
    let timer = 0;
    const fallback = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(done, 120);
    };
    track.addEventListener("scrollend", done);
    track.addEventListener("scroll", fallback, { passive: true });
    return () => {
      track.removeEventListener("scrollend", done);
      track.removeEventListener("scroll", fallback);
      window.clearTimeout(timer);
    };
  }, [trackRef, onChange]);

  const markSwiping = useCallback(() => {
    swiping.current = true;
  }, []);
  return { markSwiping };
}
