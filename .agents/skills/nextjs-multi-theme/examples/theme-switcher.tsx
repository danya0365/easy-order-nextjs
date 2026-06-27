// Theme Switcher Component
// src/presentation/components/theme-switcher.tsx

"use client";

import { useThemeStore, ThemeTemplate } from "@/presentation/stores/theme.store";

const templates: {
  value: ThemeTemplate;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "core",
    label: "Core",
    description: "อ่านง่าย เหมาะกับทุกวัย",
    icon: "👁️",
  },
  {
    value: "minimal",
    label: "Minimal",
    description: "เรียบง่าย เน้นเนื้อหา",
    icon: "◻️",
  },
  {
    value: "retro-megazine",
    label: "Retro",
    description: "อบอุ่น มีสไตล์",
    icon: "📰",
  },
];

export function ThemeSwitcher() {
  const { template, setTemplate } = useThemeStore();

  return (
    <div className="space-y-3">
      <p className="text-sm text-core-text-muted dark:text-core-text-muted">
        เลือกธีม
      </p>
      <div className="flex flex-col gap-2">
        {templates.map((t) => (
          <button
            key={t.value}
            onClick={() => setTemplate(t.value)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all
              ${template === t.value
                ? "bg-core-primary text-white shadow-md"
                : "bg-core-surface text-core-text hover:bg-core-border"
              }
            `}
            aria-pressed={template === t.value}
          >
            <span className="text-xl">{t.icon}</span>
            <div>
              <p className="font-medium">{t.label}</p>
              <p className={`text-sm ${template === t.value ? "text-white/80" : "text-core-text-muted"}`}>
                {t.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Compact version for header
export function ThemeSwitcherCompact() {
  const { template, setTemplate } = useThemeStore();

  return (
    <div className="flex items-center gap-1 rounded-lg bg-core-surface p-1">
      {templates.map((t) => (
        <button
          key={t.value}
          onClick={() => setTemplate(t.value)}
          className={`
            px-3 py-1.5 rounded-md text-sm font-medium transition-colors
            ${template === t.value
              ? "bg-core-primary text-white"
              : "text-core-text-muted hover:text-core-text"
            }
          `}
          title={t.description}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
