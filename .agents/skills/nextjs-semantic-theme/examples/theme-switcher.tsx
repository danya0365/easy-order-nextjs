// src/presentation/components/theme-switcher.tsx
// UI สลับ template + dark สำหรับวางใน header
//  - ใช้ utility ที่ผูกกับ token: bg-muted-surface, bg-brand-500, text-on-brand, text-muted, text-foreground
//  - ปุ่ม active ใช้ text-on-brand (ไม่ใช่ text-white) เพื่อให้ dark mode อ่านออกทุกธีม
"use client";

import { Coffee, Square, Newspaper, Sun, Moon, type LucideIcon } from "lucide-react";

import {
  useThemeStore,
  type ThemeTemplate,
} from "@/src/presentation/stores/theme.store";
import { cn } from "@/src/presentation/components/ui/cn";

const TEMPLATES: { value: ThemeTemplate; label: string; icon: LucideIcon }[] = [
  { value: "cafe", label: "คาเฟ่", icon: Coffee },
  { value: "minimal", label: "มินิมอล", icon: Square },
  { value: "retro", label: "เรโทร", icon: Newspaper },
];

/** Compact template + dark switcher, intended for the header. */
export function ThemeSwitcher() {
  const template = useThemeStore((s) => s.template);
  const dark = useThemeStore((s) => s.dark);
  const setTemplate = useThemeStore((s) => s.setTemplate);
  const toggleDark = useThemeStore((s) => s.toggleDark);

  return (
    <div className="flex items-center gap-1 rounded-full bg-muted-surface p-1">
      {TEMPLATES.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => setTemplate(t.value)}
            title={t.label}
            aria-pressed={template === t.value}
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-sm transition",
              template === t.value
                ? "bg-brand-500 text-on-brand"
                : "text-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="ml-1 hidden sm:inline">{t.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={toggleDark}
        title={dark ? "โหมดสว่าง" : "โหมดมืด"}
        aria-pressed={dark}
        className="inline-flex items-center rounded-full px-2.5 py-1 text-sm text-muted transition hover:text-foreground"
      >
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    </div>
  );
}
