"use client";

import { Delete } from "lucide-react";

export const KIOSK_PIN_MAX = 6;
export const KIOSK_PIN_MIN = 4;

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

interface KioskPinPadProps {
  pin: string;
  onDigit: (d: string) => void;
  onBackspace: () => void;
  isError?: boolean;
}

export function KioskPinPad({
  pin,
  onDigit,
  onBackspace,
  isError = false,
}: KioskPinPadProps) {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex gap-3">
        {Array.from({ length: KIOSK_PIN_MAX }, (_, i) => (
          <div
            key={i}
            className={`size-3.5 rounded-full border-2 transition-colors ${
              i < pin.length
                ? isError
                  ? "border-error bg-error"
                  : "border-foreground bg-foreground"
                : "border-muted"
            }`}
          />
        ))}
      </div>

      <div className="grid w-full grid-cols-3 gap-2">
        {DIGITS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDigit(d)}
            className="flex h-16 items-center justify-center rounded-2xl bg-muted-surface text-2xl font-semibold text-foreground transition hover:bg-border active:scale-95"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          type="button"
          onClick={() => onDigit("0")}
          className="flex h-16 items-center justify-center rounded-2xl bg-muted-surface text-2xl font-semibold text-foreground transition hover:bg-border active:scale-95"
        >
          0
        </button>
        <button
          type="button"
          onClick={onBackspace}
          className="flex h-16 items-center justify-center rounded-2xl bg-muted-surface text-muted transition hover:bg-border active:scale-95"
        >
          <Delete className="size-6" />
        </button>
      </div>
    </div>
  );
}
