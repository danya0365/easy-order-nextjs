"use client";

import type { ReactNode } from "react";

import { cn } from "@/src/presentation/components/ui/cn";

/** Accessible on/off switch row: label + hint on the left, pill switch on the right. */
export function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
  hint,
  testId,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: ReactNode;
  hint?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        data-testid={testId}
        data-state={checked ? "on" : "off"}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50",
          checked ? "bg-success" : "bg-border",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}
