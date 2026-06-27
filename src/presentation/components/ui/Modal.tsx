"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock the background while open. On mobile, leaving <body> scrollable behind a
  // full-screen overlay lets the browser's URL bar show/hide as the page reflows,
  // which resizes the viewport repeatedly and makes the whole screen flicker. The
  // position:fixed technique (not just overflow:hidden) is what holds on iOS Safari.
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const s = document.body.style;
    const prev = {
      position: s.position,
      top: s.top,
      width: s.width,
      overflow: s.overflow,
    };
    s.position = "fixed";
    s.top = `-${scrollY}px`;
    s.width = "100%";
    s.overflow = "hidden";
    return () => {
      s.position = prev.position;
      s.top = prev.top;
      s.width = prev.width;
      s.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <h3 className="mb-3 text-lg font-semibold text-foreground">{title}</h3>
        )}
        <div className="text-foreground">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
