"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";

/**
 * Minimal, dependency-free image cropper: drag to pan, slider to zoom, fixed
 * crop window (its shape = `aspect`). Everything is plain React state + a final
 * canvas draw — no ResizeObserver, no library lifecycle — so it can't drive the
 * re-render/observer loops that cropperjs/react-easy-crop did on mobile.
 *
 * The crop window is what-you-see-is-what-you-get: the visible box IS the output.
 */
export interface SimpleCropperHandle {
  /** Draw the visible crop to a canvas (natural pixels, capped to maxWidth/Height). */
  getCroppedCanvas(opts?: {
    maxWidth?: number;
    maxHeight?: number;
  }): HTMLCanvasElement | null;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export const SimpleImageCropper = forwardRef<
  SimpleCropperHandle,
  { src: string; aspect: number | null }
>(function SimpleImageCropper({ src, aspect }, ref) {
  const t = useTranslations("common");
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // Free crop (NaN/null) → the window matches the photo's own ratio.
  const windowAspect =
    aspect && Number.isFinite(aspect)
      ? aspect
      : nat.w && nat.h
        ? nat.w / nat.h
        : 1;

  // "cover" base scale so the image always fills the crop window, then × zoom.
  const baseScale =
    box.w && nat.w ? Math.max(box.w / nat.w, box.h / nat.h) : 1;
  const displayedScale = baseScale * scale;
  const dW = nat.w * displayedScale;
  const dH = nat.h * displayedScale;

  const clampPos = useCallback(
    (p: { x: number; y: number }, dw: number, dh: number) => ({
      x: clamp(p.x, box.w - dw, 0),
      y: clamp(p.y, box.h - dh, 0),
    }),
    [box.w, box.h],
  );

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setBox({ w: r.width, h: r.height });
  }, []);

  // Re-measure when the window reshapes (aspect change).
  useLayoutEffect(() => {
    measure();
  }, [windowAspect, measure]);

  // Re-center whenever the box or image changes.
  useLayoutEffect(() => {
    if (!box.w || !nat.w) return;
    const bs = Math.max(box.w / nat.w, box.h / nat.h);
    const dw = nat.w * bs * scale;
    const dh = nat.h * bs * scale;
    setPos(clampPos({ x: (box.w - dw) / 2, y: (box.h - dh) / 2 }, dw, dh));
    // Only re-center on box/image change, not on every pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box.w, box.h, nat.w, nat.h]);

  function onLoad() {
    const img = imgRef.current;
    if (!img) return;
    setScale(1);
    setNat({ w: img.naturalWidth, h: img.naturalHeight });
    measure();
  }

  function onZoom(next: number) {
    // Zoom around the window centre so it doesn't drift.
    const cx = box.w / 2;
    const cy = box.h / 2;
    const ratio = next / scale;
    const nx = cx - (cx - pos.x) * ratio;
    const ny = cy - (cy - pos.y) * ratio;
    const ndW = nat.w * baseScale * next;
    const ndH = nat.h * baseScale * next;
    setScale(next);
    setPos(clampPos({ x: nx, y: ny }, ndW, ndH));
  }

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    setPos((p) => clampPos({ x: p.x + dx, y: p.y + dy }, dW, dH));
  }
  function onPointerUp(e: React.PointerEvent) {
    drag.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // pointer may already be released
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      getCroppedCanvas(opts) {
        const img = imgRef.current;
        if (!img || !nat.w || !box.w) return null;
        const ds = baseScale * scale;
        let sx = -pos.x / ds;
        let sy = -pos.y / ds;
        let sw = box.w / ds;
        let sh = box.h / ds;
        // Keep the source rect inside the image.
        sx = clamp(sx, 0, nat.w);
        sy = clamp(sy, 0, nat.h);
        sw = Math.min(sw, nat.w - sx);
        sh = Math.min(sh, nat.h - sy);

        const maxW = opts?.maxWidth ?? 2000;
        const maxH = opts?.maxHeight ?? 2000;
        const k = Math.min(1, maxW / sw, maxH / sh);
        const outW = Math.max(1, Math.round(sw * k));
        const outH = Math.max(1, Math.round(sh * k));

        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
        return canvas;
      },
    }),
    [nat.w, nat.h, box.w, box.h, baseScale, scale, pos.x, pos.y],
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        className="relative w-full touch-none select-none overflow-hidden rounded-lg bg-black/80"
        style={{ aspectRatio: String(windowAspect), maxHeight: "55vh" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          onLoad={onLoad}
          className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
          style={{ width: dW, height: dH, transform: `translate(${pos.x}px, ${pos.y}px)` }}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-muted">
        {t("zoom")}
        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={scale}
          onChange={(e) => onZoom(Number(e.target.value))}
          className="flex-1 accent-brand-500"
        />
      </label>
    </div>
  );
});
