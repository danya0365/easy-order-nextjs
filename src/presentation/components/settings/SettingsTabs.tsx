"use client";

import { useState, type ReactNode } from "react";
import { ImageIcon, Info, MonitorSmartphone, Store } from "lucide-react";
import { useTranslations } from "next-intl";

import { TabSelect } from "@/src/presentation/components/ui/TabSelect";

// Icons are referenced by string key because functions (component refs) can't
// be passed from a server component into this client component as props.
const ICONS = { shop: Store, info: Info, image: ImageIcon, kiosk: MonitorSmartphone };
export type SettingsTabIcon = keyof typeof ICONS;

type Tab = {
  id: string;
  label: string;
  icon?: SettingsTabIcon;
  content: ReactNode;
};

/**
 * Tabbed settings layout. On desktop (lg+) the tab nav sits in a left sidebar
 * next to the content so the page fills the width; on mobile it's a custom
 * dropdown above the content. `footer` (if given) always renders below,
 * regardless of the active tab.
 */
export function SettingsTabs({
  tabs,
  footer,
}: {
  tabs: Tab[];
  footer?: ReactNode;
}) {
  const t = useTranslations("common");
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <div>
      {/* Mobile (<lg): custom dropdown instead of a cramped horizontal strip. */}
      <div className="mb-4 lg:hidden">
        <TabSelect
          ariaLabel={t("settingsCategoryAria")}
          value={current?.id ?? ""}
          onChange={setActive}
          options={tabs.map((tab) => {
            const Icon = tab.icon ? ICONS[tab.icon] : null;
            return {
              id: tab.id,
              label: tab.label,
              icon: Icon ? <Icon className="size-4 shrink-0" /> : undefined,
            };
          })}
        />
      </div>

      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-6">
        {/* Desktop (lg+): left sidebar tab nav. */}
        <nav
          className="hidden lg:flex lg:flex-col lg:gap-1"
          aria-label={t("settingsCategoryAria")}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon ? ICONS[tab.icon] : null;
            const isActive = tab.id === current?.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                aria-current={isActive}
                className={`inline-flex w-full shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-600 text-on-brand"
                    : "text-muted hover:bg-muted-surface hover:text-foreground"
                }`}
              >
                {Icon && <Icon className="size-4 shrink-0" />}
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-col gap-4">{current?.content}</div>
      </div>

      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}
