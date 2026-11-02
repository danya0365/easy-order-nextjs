import Link from "next/link";
import { ChevronLeft, ListChecks, Square } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import {
  TRAINING_GROUPS,
  findGuide,
  type TrainingGroupId,
} from "@/src/domain/guides/shop-guides";
import { GuidePrintButton } from "@/src/presentation/components/guides/GuideQr";

export const dynamic = "force-dynamic";

const GROUP_KEY = {
  setup: "grpSetup",
  daily: "grpDaily",
  customer: "grpCustomer",
  rider: "grpRider",
  addons: "grpAddons",
} as const satisfies Record<TrainingGroupId, string>;

export default async function TrainingChecklistPage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("guides");
  const lang = (await getLocale()) === "en" ? "en" : "th";
  const shop = await container.shopRepository.findById(shopId);
  let n = 0;

  return (
    <div className="mx-auto max-w-3xl p-4 print:p-0">
      <style>{`@media print{@page{size:A4;margin:10mm}html,body{background:#fff!important}
        body *{visibility:hidden}#guide-sheet,#guide-sheet *{visibility:visible}
        #guide-sheet{position:absolute;left:0;top:0;width:100%}}`}</style>
      <div className="mb-3 flex items-center justify-between print:hidden">
        <Link href="/shop/guides" className="inline-flex items-center gap-1 text-sm text-brand-600">
          <ChevronLeft className="size-4" aria-hidden />
          {t("back")}
        </Link>
        <GuidePrintButton label={t("print")} />
      </div>
      <article
        id="guide-sheet"
        data-testid="training-checklist"
        className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 text-neutral-900 print:rounded-none print:border-0 print:p-0"
      >
        <header className="flex items-start gap-3">
          <ListChecks className="size-10 shrink-0 text-brand-600" aria-hidden />
          <div>
            <h1 className="text-3xl font-extrabold leading-tight print:text-[24pt]">{t("checklistTitle")}</h1>
            <p className="text-sm text-neutral-600">{t("checklistSubtitle")}</p>
          </div>
        </header>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {(["checklistShop", "checklistDate", "checklistTrainer", "checklistTrainee"] as const).map((k) => (
            <div key={k} className="flex items-end gap-2">
              <span className="shrink-0 font-semibold">{t(k)}:</span>
              <span className="flex-1 border-b border-dotted border-neutral-500 pb-0.5" data-testid={`cl-${k}`}>
                {k === "checklistShop" ? (shop?.name ?? "") : "\u00a0"}
              </span>
            </div>
          ))}
        </div>
        {TRAINING_GROUPS.map((grp) => (
          <section key={grp.id} data-testid={`cl-group-${grp.id}`} className="break-inside-avoid">
            <h2 className="mb-1 rounded-md bg-brand-500 px-2 py-0.5 text-sm font-bold text-white">{t(GROUP_KEY[grp.id])}</h2>
            <ul className="flex flex-col">
              {grp.slugs.map((slug) => {
                const g = findGuide(slug);
                if (!g) return null;
                n += 1;
                return (
                  <li key={slug} className="flex items-center gap-2 border-b border-neutral-200 py-1 text-sm">
                    <Square className="size-5 shrink-0 text-neutral-700" aria-hidden />
                    <span className="w-5 font-semibold">{n}.</span>
                    <span className="flex-1">
                      <span className="font-semibold">{g.title[lang]}</span>
                      <span className="text-xs text-neutral-500"> — {g.purpose[lang]}</span>
                    </span>
                    <span className="w-24 shrink-0 border-b border-dotted border-neutral-400 text-right text-[10px] text-neutral-400">{t("checklistDate")}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">{t("checklistNotes")}:</span>
          <span className="h-6 border-b border-dotted border-neutral-500" />
          <span className="h-6 border-b border-dotted border-neutral-500" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-8 text-center text-sm">
          {(["checklistTrainer", "checklistTrainee"] as const).map((k) => (
            <div key={k} className="flex flex-col gap-1">
              <span className="h-8 border-b border-neutral-600" />
              <span>{t("checklistSign")} {t(k)}</span>
              <span className="text-xs text-neutral-500">{t("checklistDate")} ____/____/______</span>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
