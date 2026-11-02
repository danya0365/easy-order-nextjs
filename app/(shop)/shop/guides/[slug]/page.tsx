import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, LifeBuoy, QrCode, ScanLine } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { findGuide } from "@/src/domain/guides/shop-guides";
import { getBaseUrl } from "@/src/presentation/lib/base-url";
import { mintClaimToken } from "@/src/infrastructure/auth/order-access";
import {
  GuideAutoPrint,
  GuidePrintButton,
  GuideQr,
} from "@/src/presentation/components/guides/GuideQr";

export const dynamic = "force-dynamic";

export default async function ShopGuideDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const autoPrint = (await searchParams).print === "1";
  const guide = findGuide(slug);
  if (!guide) notFound();
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("guides");
  const lang = (await getLocale()) === "en" ? "en" : "th";
  const shop = await container.shopRepository.findById(shopId);
  const base = await getBaseUrl();
  // Customer guide: same HMAC claim link as the shop's order QR (settings page) — sets eo_order_<slug>.
  const orderToken =
    guide.qr === "order-enter" && shop?.onlineOrderingEnabled
      ? mintClaimToken(shop.slug, shop.id)
      : null;
  const qrUrl =
    guide.qr === "order-enter"
      ? orderToken && shop
        ? `${base}/s/${shop.slug}/enter?t=${orderToken}`
        : null
      : `${base}${guide.targetPath}`;
  const customer = guide.audience.includes("customer");
  const audLabel = guide.audience
    .map((a) =>
      t(
        a === "owner" ? "audOwner" : a === "staff" ? "audStaff" : "audCustomer",
      ),
    )
    .join(" · ");
  const updated = new Date(
    `${guide.updated}T00:00:00+07:00`,
  ).toLocaleDateString(lang === "en" ? "en-GB" : "th-TH", {
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
        <Link
          href="/shop/guides"
          className="inline-flex items-center gap-1 text-sm text-brand-600"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {t("back")}
        </Link>
        <GuidePrintButton label={t("print")} />
        {autoPrint && qrUrl && <GuideAutoPrint />}
      </div>

      {customer ? (
        <article
          id="guide-sheet"
          data-testid="guide-sheet"
          className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 text-neutral-900 print:rounded-none print:border-0 print:p-0"
        >
          <header className="flex flex-col items-center gap-2 text-center">
            <p
              className="text-lg font-bold text-brand-600 print:text-[15pt]"
              data-testid="guide-shop"
            >
              {shop?.name ?? ""}
            </p>
            <h1 className="text-4xl font-extrabold leading-tight print:text-[34pt]">
              {guide.title[lang]}
            </h1>
            <p className="text-lg text-neutral-700 print:text-[14pt]">
              {guide.purpose[lang]}
            </p>
            <div className="flex items-center gap-4 rounded-2xl border-4 border-brand-500 p-3">
              {qrUrl ? (
                <GuideQr url={qrUrl} alt={t("qrAlt")} size="lg" />
              ) : (
                <p
                  className="max-w-56 text-sm text-red-700"
                  data-testid="guide-qr-off"
                >
                  {t("customerQrOff")}
                </p>
              )}
              <div className="flex max-w-44 flex-col items-center gap-2 text-center">
                <ScanLine className="size-12 text-brand-600" aria-hidden />
                <span className="text-xl font-bold leading-tight print:text-[17pt]">
                  {t("customerQrHint")}
                </span>
              </div>
            </div>
            <p
              className="flex items-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-1.5 text-base print:text-[12pt]"
              data-testid="guide-scan-note"
            >
              <QrCode className="size-5 shrink-0" aria-hidden />
              {t("customerScanNote")}
            </p>
          </header>

          <ol
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            data-testid="guide-steps"
          >
            {guide.steps.map((s, i) => (
              <li
                key={i}
                className="flex flex-col gap-1.5 rounded-xl border border-neutral-200 p-2 break-inside-avoid"
              >
                <div className="flex items-start gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-base font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="text-base font-semibold leading-snug print:text-[12.5pt]">
                    {s.text[lang]}
                  </p>
                </div>
                {s.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.image}
                    alt=""
                    className="w-full rounded-lg border border-neutral-200 object-cover object-top print:h-[50mm]"
                  />
                )}
              </li>
            ))}
          </ol>

          <section
            className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3"
            data-testid="guide-tips"
          >
            <h2 className="mb-1 flex items-center gap-1.5 text-lg font-bold print:text-[13pt]">
              <LifeBuoy className="size-5" aria-hidden />
              {t("problemTitle")}
            </h2>
            <ul className="list-disc pl-5 text-base print:text-[12pt]">
              {guide.tips.map((tip, i) => (
                <li key={i}>{tip[lang]}</li>
              ))}
            </ul>
            <p className="mt-1 text-base font-semibold print:text-[12pt]">
              {t("customerContact")}
            </p>
          </section>

          <footer className="flex items-center justify-between border-t border-neutral-200 pt-2 text-xs text-neutral-500">
            <span>{t("customerLabel")}</span>
            <span>{t("updated", { date: updated })}</span>
          </footer>
        </article>
      ) : (
        <article
          id="guide-sheet"
          data-testid="guide-sheet"
          className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 text-neutral-900 print:rounded-none print:border-0 print:p-0"
        >
          <header className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {t("guideLabel")}
              </p>
              <h1 className="text-3xl font-extrabold leading-tight print:text-[26pt]">
                {guide.title[lang]}
              </h1>
              <p className="text-base text-neutral-700">
                {guide.purpose[lang]}
              </p>
              <p className="text-xs text-neutral-500">
                {t("audience")}: {audLabel}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1">
              {qrUrl && <GuideQr url={qrUrl} alt={t("qrAlt")} />}
              <span className="max-w-32 text-center text-[10px] leading-tight text-neutral-500">
                {t("qrHint")}
              </span>
            </div>
          </header>

          <ol
            className="grid grid-cols-2 gap-3 print:grid-cols-3"
            data-testid="guide-steps"
          >
            {guide.steps.map((s, i) => (
              <li
                key={i}
                className="flex flex-col gap-1.5 rounded-xl border border-neutral-200 p-2 break-inside-avoid"
              >
                <div className="flex items-start gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-snug print:text-[9.5pt]">
                    {s.text[lang]}
                  </p>
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

          <section
            className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3"
            data-testid="guide-tips"
          >
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
      )}
    </div>
  );
}
