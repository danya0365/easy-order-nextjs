"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "./cn";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Imperative toast API. Throws if used outside <ToastProvider>. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const ICONS: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const TONE: Record<ToastKind, string> = {
  success: "text-success",
  error: "text-error",
  info: "text-brand-600",
};

const DURATION_MS = 3000;

/**
 * App-wide toast stack. Mounted once (inside ThemeProvider in the root layout).
 * Toasts auto-dismiss after ~3s, sit ABOVE the bottom tab bar on mobile, and are
 * hidden from print. Portaled to <body> so they escape any overflow/stacking
 * context (mirrors Modal).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const tr = useTranslations("common");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const msg = message?.trim();
      if (!msg) return;
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, kind, message: msg }]);
      setTimeout(() => remove(id), DURATION_MS);
    },
    [remove],
  );

  // Stable API object (push is stable via useCallback) so consumers don't
  // re-render on every toast change.
  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Empty until a toast is pushed (post-interaction): SSR and first client
          render both produce nothing, so there's no hydration mismatch. */}
      {toasts.length > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 z-60 mx-auto flex max-w-sm flex-col gap-2 px-4 print:hidden bottom-[calc(env(safe-area-inset-bottom)+5rem)] sm:bottom-6"
            role="status"
            aria-live="polite"
            aria-atomic="false"
          >
            {toasts.map((t) => {
              const Icon = ICONS[t.kind];
              return (
                <div
                  key={t.id}
                  className="pointer-events-auto flex items-start gap-2 rounded-xl bg-card px-4 py-3 text-sm shadow-lg ring-1 ring-border"
                >
                  <Icon className={cn("mt-0.5 size-4 shrink-0", TONE[t.kind])} />
                  <p className="flex-1 text-foreground">{t.message}</p>
                  <button
                    type="button"
                    onClick={() => remove(t.id)}
                    aria-label={tr("close")}
                    className="text-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
