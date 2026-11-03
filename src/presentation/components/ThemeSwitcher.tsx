"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Coffee, Square, Newspaper, Sun, Moon, Palette, type LucideIcon } from "lucide-react";
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

/**
 * Header skin switcher. Desktop (sm+): the inline pill. Mobile: a single
 * Palette button (badge = current skin) that opens a small menu — saves header
 * space. Both write the same persisted theme store.
 */
export function ThemeSwitcher() {
  return (
    <>
      <MobileThemeMenu />
      <div className="hidden sm:block">
        <InlineThemeSwitcher />
      </div>
    </>
  );
}

function MobileThemeMenu() {
  const tr = useTranslations("theme");
  const template = useThemeStore((s) => s.template);
  const dark = useThemeStore((s) => s.dark);
  const setTemplate = useThemeStore((s) => s.setTemplate);
  const toggleDark = useThemeStore((s) => s.toggleDark);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const current = TEMPLATES.find((t) => t.value === template) ?? TEMPLATES[0];
  const CurrentIcon = current.icon;

  // Close on outside tap and Escape (focus returns to the button).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    rootRef.current?.querySelector<HTMLElement>("[role=menuitemradio][aria-checked=true]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-muted-surface focus:bg-muted-surface focus:outline-none";

  return (
    <div ref={rootRef} className="relative sm:hidden">
      <button
        ref={btnRef}
        type="button"
        data-testid="skin-menu-button"
        aria-label={`${tr("skin")}: ${tr(current.labelKey)}${dark ? ` · ${tr("darkMode")}` : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex size-9 items-center justify-center rounded-full bg-muted-surface text-foreground transition hover:text-brand-600"
      >
        <Palette className="size-5" />
        <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-brand-500 text-on-brand ring-2 ring-card">
          <CurrentIcon className="size-2.5" />
        </span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={tr("skin")}
          data-testid="skin-menu"
          className="absolute right-0 top-full z-50 mt-2 w-48 rounded-2xl bg-card p-1.5 shadow-lg ring-1 ring-border"
        >
          {TEMPLATES.map((tpl) => {
            const Icon = tpl.icon;
            const on = template === tpl.value;
            return (
              <button
                key={tpl.value}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                onClick={() => {
                  setTemplate(tpl.value);
                  setOpen(false);
                }}
                className={cn(item, on && "font-semibold text-brand-600")}
              >
                <Icon className="size-4" />
                <span className="flex-1">{tr(tpl.labelKey)}</span>
                {on && <Check className="size-4" />}
              </button>
            );
          })}
          <div className="my-1 h-px bg-border" role="separator" />
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={dark}
            onClick={() => {
              toggleDark();
              setOpen(false);
            }}
            className={item}
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            <span className="flex-1">{dark ? tr("lightMode") : tr("darkMode")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function InlineThemeSwitcher() {
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
