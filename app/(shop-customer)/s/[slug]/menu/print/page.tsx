import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Phone, ShieldCheck, Store, UtensilsCrossed } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { renderQrDataUrl } from "@/src/infrastructure/services/qr";
import { getBaseUrl } from "@/src/presentation/lib/base-url";
import { contentSizeMm, parseCompactOptions } from "@/src/domain/services/compact-menu";
import { publicMenuUrl } from "@/src/domain/services/public-menu";
import { menuImageSrc } from "@/src/presentation/lib/menu-image";
import { satangToBaht } from "@/src/presentation/lib/money";
import { cn } from "@/src/presentation/components/ui/cn";
import { CompactFit } from "@/src/presentation/components/public-menu/CompactFit";
import { CompactOptionsForm } from "@/src/presentation/components/public-menu/CompactOptionsForm";
import { MenuPrintButton } from "@/src/presentation/components/public-menu/MenuPrintButton";
import { loadPublicMenuSections, loadPublicMenuShop } from "../load-menu";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadPublicMenuShop(slug);
  if (!data) notFound();
  const t = await getTranslations("publicMenu");
  return { title: t("compactMetaTitle", { name: data.shop.name }), robots: { index: false } };
}

/**
 * One-page compact print menu: every available item on 1–2 sheets for
 * laminating. Read-only; no ordering. Options come from the query string so a
 * configured sheet is a shareable URL.
 */
export default async function CompactMenuPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await loadPublicMenuShop(slug);
  if (!data) notFound();
  const { shop, view: s } = data;
  const o = parseCompactOptions(sp);
  const embed = sp.embed === "1";
  const [t, sections, baseUrl] = await Promise.all([
    getTranslations("publicMenu"),
    loadPublicMenuSections(shop.id),
    getBaseUrl(),
  ]);
  const menuUrl = publicMenuUrl(baseUrl, slug);
  const qr = o.footer ? await renderQrDataUrl(menuUrl) : null;
  const page = contentSizeMm(o.paper, o.orient);
  const p = s.profile;
  const basePath = `/s/${slug}/menu/print`;

  return (
    <main className={cn("compact-page mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4", embed && "compact-embed")} data-testid="compact-page">
      {/* Named @page so this sheet's size never leaks into the other print views */}
      <style>{`@page compact { size: ${o.paper} ${o.orient}; margin: 8mm; }`}</style>

      {!embed && (
        <div className="flex flex-col gap-3 rounded-2xl bg-card p-3 ring-1 ring-border print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/s/${slug}/menu`} className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-semibold text-muted hover:text-foreground">
              <ArrowLeft className="size-4" /> {t("backToMenu")}
            </Link>
            <h1 className="min-w-0 flex-1 truncate text-base font-bold text-foreground">{t("compactTitle")}</h1>
            <MenuPrintButton />
          </div>
          <CompactOptionsForm basePath={basePath} options={o} />
          <p className="text-xs text-muted">{t("printHint")}</p>
        </div>
      )}

      <CompactFit key={`${o.paper}-${o.orient}-${o.cols}-${o.thumbs}-${o.desc}-${o.footer}`} pageWidthMm={page.w} pageHeightMm={page.h}>
        <div className={cn("compact-inner", o.paper === "A3" && "compact-a3")} data-paper={o.paper} data-orient={o.orient} data-cols={o.cols}>
          <header className="compact-head">
            {s.logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- internal image route
              <img src={s.logoSrc} alt="" className="compact-logo" />
            ) : (
              <span className="compact-logo compact-logo-empty"><Store /></span>
            )}
            <div className="min-w-0 flex-1">
              <p className="compact-kicker">{t("menuHeading")}</p>
              <h2 className="compact-name">{shop.name}</h2>
            </div>
            <span className="compact-halal"><ShieldCheck /> {t("halal")}</span>
          </header>

          {sections.length === 0 ? (
            <p className="compact-empty"><UtensilsCrossed /> {t("empty")}</p>
          ) : (
            <div className="compact-cols" style={{ columnCount: o.cols }}>
              {sections.map((sec) => (
                <section key={sec.category.id} className="compact-cat">
                  <h3 className="compact-cat-title">{sec.category.name}</h3>
                  <ul>
                    {sec.items.map((item) => {
                      const img = o.thumbs ? menuImageSrc(item) : null;
                      return (
                        <li key={item.id} className="compact-item" data-testid="compact-item">
                          {o.thumbs && (
                            <span className="compact-thumb">
                              {img ? (
                                // eslint-disable-next-line @next/next/no-img-element -- internal image route
                                <img src={img} alt="" />
                              ) : (
                                <UtensilsCrossed />
                              )}
                            </span>
                          )}
                          <span className="compact-item-body">
                            <span className="compact-line">
                              <span className="compact-item-name">{item.name}</span>
                              <span className="compact-leader" aria-hidden />
                              <span className="compact-price">฿{satangToBaht(item.priceSatang)}</span>
                            </span>
                            {o.desc && item.description && <span className="compact-desc">{item.description}</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {o.footer && (
            <footer className="compact-foot" data-testid="compact-footer">
              <div className="compact-contact">
                {p?.phone && <span><Phone /> {p.phone}</span>}
                {p?.lineUrl && <span><MessageCircle /> {p.lineUrl.replace(/^https?:\/\//, "")}</span>}
                {s.branch?.address && <span>{s.branch.address}</span>}
              </div>
              {qr && (
                <div className="compact-qr">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
                  <img src={qr} alt={t("qrAlt")} />
                  <span>{t("footerScan")}<br />{menuUrl.replace(/^https?:\/\//, "")}</span>
                </div>
              )}
            </footer>
          )}
        </div>
      </CompactFit>
    </main>
  );
}
