"use client";

import { Coffee, Square, Newspaper, Sun, Moon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  useThemeStore,
  type ThemeTemplate,
} from "@/src/presentation/stores/theme.store";
import { cn } from "@/src/presentation/components/ui/cn";

/** `labelKey` is a `theme`-namespace message key (resolved at render). */
const TEMPLATES: {
  value: ThemeTemplate;
  labelKey: "cafe" | "minimal" | "retro";
  icon: LucideIcon;
}[] = [
  { value: "cafe", labelKey: "cafe", icon: Coffee },
  { value: "minimal", labelKey: "minimal", icon: Square },
  { value: "retro", labelKey: "retro", icon: Newspaper },
];

/** Compact template + dark switcher, intended for the header. */
export function ThemeSwitcher() {
  const tr = useTranslations("theme");
  const template = useThemeStore((s) => s.template);
  const dark = useThemeStore((s) => s.dark);
  const setTemplate = useThemeStore((s) => s.setTemplate);
  const toggleDark = useThemeStore((s) => s.toggleDark);

  return (
    <div className="flex items-center gap-1 rounded-full bg-muted-surface p-1">
      {TEMPLATES.map((tpl) => {
        const Icon = tpl.icon;
        const label = tr(tpl.labelKey);
        return (
          <button
            key={tpl.value}
            type="button"
            onClick={() => setTemplate(tpl.value)}
            title={label}
            aria-pressed={template === tpl.value}
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-sm transition",
              template === tpl.value
                ? "bg-brand-500 text-on-brand"
                : "text-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="ml-1 hidden sm:inline">{label}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={toggleDark}
        title={dark ? tr("lightMode") : tr("darkMode")}
        aria-pressed={dark}
        className="inline-flex items-center rounded-full px-2.5 py-1 text-sm text-muted transition hover:text-foreground"
      >
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    </div>
  );
}
