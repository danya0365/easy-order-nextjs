"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";

export function CopyLinkButton({ url }: { url: string }) {
  const t = useTranslations("publicMenu");
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked — the link is still visible to copy by hand */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground ring-1 ring-border transition hover:bg-muted-surface"
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {done ? t("copied") : t("copy")}
    </button>
  );
}
