"use client";

import { useEffect, useRef, useState, type ComponentProps, type Ref } from "react";

import { QrPrintCard, qrCardSizeMm } from "./QrPrintCard";

const MM_PX = 96 / 25.4;

/** Scales a true-size QrPrintCard down to `displayWidth` px for on-screen preview. */
export function QrCardPreview({
  displayWidth = 300,
  cardRef,
  ...card
}: ComponentProps<typeof QrPrintCard> & { displayWidth?: number; cardRef?: Ref<HTMLDivElement> }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(displayWidth);
  useEffect(() => {
    const el = box.current?.parentElement;
    if (!el) return;
    const update = () => setWidth(Math.min(displayWidth, el.clientWidth || displayWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [displayWidth]);
  const { w, h } = qrCardSizeMm(card.paper ?? "A6");
  const scale = width / (w * MM_PX);
  return (
    <div
      ref={box}
      data-testid="qr-card-preview"
      style={{ width, height: h * MM_PX * scale, overflow: "hidden", borderRadius: 12, boxShadow: "0 4px 18px rgba(0,0,0,.10)" }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: `${w}mm` }}>
        <QrPrintCard {...card} ref={cardRef} />
      </div>
    </div>
  );
}
