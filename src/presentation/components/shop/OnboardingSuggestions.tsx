"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  MessageCircle,
  Settings,
  UserCog,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { useOnboardingStore } from "@/src/presentation/stores/onboarding.store";
import { BRAND } from "@/src/config/brand";

type Item = {
  key: string;
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  description: string;
  href: string;
};

/**
 * Smart "getting started" card: surfaces only the next steps the shop hasn't
 * done yet. An item disappears once its condition is satisfied OR the owner
 * dismisses it (✕). Dismissals persist per-shop in localStorage. The whole card
 * renders nothing when there's nothing left to show.
 */
export function OnboardingSuggestions({
  shopId,
  menuReady,
  kioskReady,
  lineLinked,
  hasStaff,
}: {
  shopId: string;
  menuReady: boolean;
  kioskReady: boolean;
  lineLinked: boolean;
  hasStaff: boolean;
}) {
  const t = useTranslations("shop");
  const all: Item[] = [];
  if (!menuReady) {
    all.push({
      key: "menu",
      icon: UtensilsCrossed,
      iconClassName: "bg-brand-100 text-brand-700",
      title: t("obMenuTitle"),
      description: t("obMenuDesc"),
      href: "/shop/menu",
    });
  }
  if (!kioskReady) {
    all.push({
      key: "kiosk",
      icon: Settings,
      iconClassName: "bg-brand-100 text-brand-700",
      title: t("obKioskTitle"),
      description: t("obKioskDesc"),
      href: "/shop/kiosk",
    });
  }
  if (!lineLinked) {
    all.push({
      key: "line",
      icon: MessageCircle,
      // eslint-disable-next-line no-restricted-syntax -- #06C755 is LINE's official brand color
      iconClassName: "bg-[#06C755]/10 text-[#06C755]",
      title: t("obLineTitle"),
      description: t("obLineDesc"),
      href: "/shop/security",
    });
  }
  if (!hasStaff) {
    all.push({
      key: "staff",
      icon: UserCog,
      iconClassName: "bg-brand-100 text-brand-700",
      title: t("obStaffTitle"),
      description: t("obStaffDesc"),
      href: "/shop/staff",
    });
  }

  const dismissedList = useOnboardingStore((s) => s.dismissed[shopId]);
  const dismiss = useOnboardingStore((s) => s.dismiss);

  // Rehydrate from localStorage after mount (store uses skipHydration so the
  // first render matches the server — no hydration mismatch).
  useEffect(() => {
    useOnboardingStore.persist.rehydrate();
  }, []);

  const dismissedSet = new Set(dismissedList ?? []);
  const visible = all.filter((i) => !dismissedSet.has(i.key));

  if (visible.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title={t("obTitle")}
        subtitle={t("obSubtitle", { brand: BRAND.name })}
        action={<Badge tone="brand">{t("obRemaining", { count: visible.length })}</Badge>}
      />
      <ul className="flex flex-col divide-y divide-border">
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.key} className="flex items-center gap-1">
              <Link
                href={item.href}
                className="group flex min-w-0 flex-1 items-center gap-3 py-3"
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl ${item.iconClassName}`}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">
                    {item.title}
                  </span>
                  <span className="block text-sm text-muted">
                    {item.description}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </Link>
              <button
                type="button"
                onClick={() => dismiss(shopId, item.key)}
                aria-label={t("obDismiss")}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-muted-surface hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
