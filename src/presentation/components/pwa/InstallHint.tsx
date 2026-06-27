"use client";

import { useEffect, useState } from "react";
import { Smartphone, Share } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/src/presentation/components/ui/Button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

/**
 * Helps the customer keep their card one tap away:
 *  - Android/Chrome: captures `beforeinstallprompt` → "เพิ่มลงหน้าจอหลัก" button
 *  - iOS Safari: shows the manual Share → Add instruction
 * Hidden when already running as an installed (standalone) app.
 */
export function InstallHint() {
  const t = useTranslations("common");
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(true); // assume installed → hide until proven otherwise
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Defer to a microtask so this isn't a synchronous setState in the effect
    // body, and to avoid any SSR/hydration mismatch (initial render = hidden).
    queueMicrotask(() => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true;
      setStandalone(isStandalone);
      setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
    });

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (standalone) return null;

  if (promptEvent) {
    return (
      <Button
        variant="outline"
        fullWidth
        onClick={() => {
          void promptEvent.prompt();
          setPromptEvent(null);
        }}
      >
        <Smartphone className="size-4" />
        {t("installAddToHome")}
      </Button>
    );
  }

  if (isIOS) {
    return (
      <p className="rounded-lg bg-brand-50 px-3 py-2 text-center text-sm text-brand-700 ring-1 ring-brand-100">
        <Smartphone className="mr-1 inline size-4 align-text-bottom" />
        {t("installIosTapPrefix")}{" "}
        <strong className="inline-flex items-center gap-0.5 align-text-bottom">
          <Share className="size-4" /> {t("installIosShare")}
        </strong>{" "}
        {t("installIosThenSelect")} <strong>{t("installIosAddToHome")}</strong>
      </p>
    );
  }

  return null;
}
