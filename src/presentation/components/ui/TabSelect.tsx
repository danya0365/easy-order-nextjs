"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "./cn";

export interface TabSelectOption {
  id: string;
  label: string;
  icon?: ReactNode;
}

/**
 * Custom (non-native) anchored dropdown for picking one option — used as the
 * mobile replacement for content-tab rows. The trigger shows the current
 * option; tapping it opens a panel right below that lists the options. Closes
 * on pick, outside click (transparent scrim), or Escape.
 */
export function TabSelect({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: TabSelectOption[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value) ?? options[0];

  // Close on Escape (mirrors AppTabBar's MoreSheet).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:border-brand-300"
      >
        <span className="flex min-w-0 items-center gap-2">
          {current?.icon}
          <span className="truncate">{current?.label}</span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          {/* Transparent scrim: outside click closes the panel. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <ul
            role="listbox"
            aria-label={ariaLabel}
            className="absolute inset-x-0 z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
          >
            {options.map((opt) => {
              const isActive = opt.id === current?.id;
              return (
                <li key={opt.id} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition",
                      isActive
                        ? "bg-brand-50 font-medium text-brand-700"
                        : "text-foreground hover:bg-muted-surface",
                    )}
                  >
                    {opt.icon}
                    <span className="truncate">{opt.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
