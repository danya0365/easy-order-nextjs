import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, LifeBuoy } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { findGuide } from "@/src/domain/guides/shop-guides";
import { getBaseUrl } from "@/src/presentation/lib/base-url";
import { GuidePrintButton, GuideQr } from "@/src/presentation/components/guides/GuideQr";

export const dynamic = "force-dynamic";

export default async function ShopGuideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) notFound();
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("guides");
  const lang = (await getLocale()) === "en" ? "en" : "th";
  const shop = await container.shopRepository.findById(shopId);
  const qrUrl = `${await getBaseUrl()}${guide.targetPath}`;
  const updated = new Date(`${guide.updated}T00:00:00+07:00`).toLocaleDateString(lang === "en" ? "en-GB" : "th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });

  return (
    <div className="mx-auto max-w-3xl p-4 print:p-0">
      <style>{`@media print{@page{size:A4;margin:9mm}html,body{background:#fff!important}
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
        data-testid="guide-sheet"
        className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 text-neutral-900 print:rounded-none print:border-0 print:p-0"
      >
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{t("guideLabel")}</p>
            <h1 className="text-3xl font-extrabold leading-tight print:text-[26pt]">{guide.title[lang]}</h1>
            <p className="text-base text-neutral-700">{guide.purpose[lang]}</p>
            <p className="text-xs text-neutral-500">
              {t("audience")}: {guide.audience.map((a) => t(a === "owner" ? "audOwner" : "audStaff")).join(" · ")}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1">
            <GuideQr url={qrUrl} alt={t("qrAlt")} />
            <span className="max-w-32 text-center text-[10px] leading-tight text-neutral-500">{t("qrHint")}</span>
          </div>
        </header>

        <ol className="grid grid-cols-2 gap-3 print:grid-cols-3" data-testid="guide-steps">
          {guide.steps.map((s, i) => (
            <li key={i} className="flex flex-col gap-1.5 rounded-xl border border-neutral-200 p-2 break-inside-avoid">
              <div className="flex items-start gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <p className="text-sm leading-snug print:text-[9.5pt]">{s.text[lang]}</p>
              </div>
              {s.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.image}
                  alt=""
                  className="w-full rounded-lg border border-neutral-200 object-cover object-center print:h-[52mm]"
                />
              )}
            </li>
          ))}
        </ol>

        <section className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3" data-testid="guide-tips">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-bold">
            <LifeBuoy className="size-4" aria-hidden />
            {t("problemTitle")}
          </h2>
          <ul className="list-disc pl-5 text-sm print:text-[9.5pt]">
            {guide.tips.map((tip, i) => (
              <li key={i}>{tip[lang]}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-neutral-700">{t("contact")}</p>
        </section>

        <footer className="flex items-center justify-between border-t border-neutral-200 pt-2 text-xs text-neutral-500">
          <span data-testid="guide-shop">{shop?.name ?? ""}</span>
          <span>{t("updated", { date: updated })}</span>
        </footer>
      </article>
    </div>
  );
}
