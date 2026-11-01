"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  compactOptionsQuery,
  type CompactOptions,
} from "@/src/domain/services/compact-menu";

/** Option selects — every change re-renders the server sheet via the URL. */
export function CompactOptionsForm({ basePath, options }: { basePath: string; options: CompactOptions }) {
  const t = useTranslations("publicMenu");
  const router = useRouter();
  const set = (patch: Partial<CompactOptions>) => {
    const q = compactOptionsQuery({ ...options, ...patch });
    router.replace(q ? `${basePath}?${q}` : basePath, { scroll: false });
  };
  const sel = "rounded-lg bg-card px-2 py-1.5 text-sm text-foreground ring-1 ring-border";
  const field = (label: string, el: React.ReactNode) => (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
      {label}
      {el}
    </label>
  );
  const yesNo = (key: "thumbs" | "desc" | "footer") => (
    <select name={key} className={sel} value={options[key] ? "1" : "0"} onChange={(e) => set({ [key]: e.target.value === "1" })}>
      <option value="1">{t("optShow")}</option>
      <option value="0">{t("optHide")}</option>
    </select>
  );
  return (
    <div className="flex flex-wrap items-end gap-3" data-testid="compact-options">
      {field(t("optPaper"), (
        <select name="paper" className={sel} value={options.paper} onChange={(e) => set({ paper: e.target.value as CompactOptions["paper"] })}>
          <option value="A4">A4</option>
          <option value="A3">A3</option>
        </select>
      ))}
      {field(t("optOrient"), (
        <select name="orient" className={sel} value={options.orient} onChange={(e) => set({ orient: e.target.value as CompactOptions["orient"] })}>
          <option value="portrait">{t("optPortrait")}</option>
          <option value="landscape">{t("optLandscape")}</option>
        </select>
      ))}
      {field(t("optCols"), (
        <select name="cols" className={sel} value={String(options.cols)} onChange={(e) => set({ cols: Number(e.target.value) as CompactOptions["cols"] })}>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      ))}
      {field(t("optThumbs"), yesNo("thumbs"))}
      {field(t("optDesc"), yesNo("desc"))}
      {field(t("optFooter"), yesNo("footer"))}
    </div>
  );
}
