"use client";

import { useRef } from "react";
import { ExternalLink, FileText, Printer } from "lucide-react";
import { useTranslations } from "next-intl";

/** Dashboard card: live iframe preview of the compact menu + print/open buttons. */
export function CompactPreviewCard({ path }: { path: string }) {
  const t = useTranslations("publicMenu");
  const frame = useRef<HTMLIFrameElement>(null);
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-border" data-testid="compact-dash-card">
      <div>
        <h2 className="flex items-center gap-2 font-bold text-foreground">
          <FileText className="size-5 text-brand-600" /> {t("compactTitle")}
        </h2>
        <p className="mt-0.5 text-sm text-muted">{t("compactDesc")}</p>
      </div>
      <div className="overflow-hidden rounded-lg bg-muted-surface ring-1 ring-border">
        <iframe ref={frame} src={`${path}?embed=1`} title={t("previewTitle")} className="h-[28rem] w-full" loading="lazy" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => frame.current?.contentWindow?.print()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 text-sm font-bold text-on-brand transition hover:bg-brand-600"
          data-testid="compact-dash-print"
        >
          <Printer className="size-4" /> {t("printNow")}
        </button>
        <a href={path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-sm font-semibold ring-1 ring-border">
          <ExternalLink className="size-4" /> {t("openPreview")}
        </a>
      </div>
    </section>
  );
}
