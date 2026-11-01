import { BookOpen, Clock, Globe, MapPin, MessageCircle, Phone, QrCode, ShieldCheck, Store, ThumbsUp } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { BookPage } from "@/src/domain/services/public-menu";
import { MenuItemCard } from "./MenuItemCard";
import type { PublicMenuShop } from "./types";

/**
 * One sheet of the menu book. The SAME sheets render in the on-screen book
 * (`.menubook-track`) and in the print book (`.menuprint`) so the two never
 * drift apart. `linkItems` is off for print (links are noise on paper).
 */
export async function MenuBookSheet({
  page,
  index,
  total,
  shop,
  linkItems,
}: {
  page: BookPage;
  index: number;
  total: number;
  shop: PublicMenuShop;
  linkItems: boolean;
}) {
  const t = await getTranslations("publicMenu");
  const folio = (
    <footer className="menubook-folio">
      <span className="truncate">{shop.name}</span>
      <span>{index + 1} / {total}</span>
    </footer>
  );

  switch (page.kind) {
    case "cover":
      return (
        <article className="menubook-page menubook-cover" data-sheet="cover">
          {shop.coverSrc && (
            // eslint-disable-next-line @next/next/no-img-element -- internal image route
            <img src={shop.coverSrc} alt="" className="menubook-cover-bg" />
          )}
          <div className="menubook-cover-inner">
            <div className="menubook-book3d" aria-hidden>
              <div className="menubook-book3d-spine" />
              <div className="menubook-book3d-face">
                {shop.logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element -- internal image route
                  <img src={shop.logoSrc} alt="" className="size-full object-cover" />
                ) : (
                  <Store className="size-12" />
                )}
              </div>
            </div>
            <p className="menubook-kicker">{t("coverKicker")}</p>
            <h2 className="menubook-cover-title">{shop.name}</h2>
            {shop.categoryName && <p className="menubook-cover-sub">{shop.categoryName}</p>}
            <p className="menubook-cover-halal">
              <ShieldCheck className="size-4" /> {t("halal")}
            </p>
            <p className="menubook-cover-hint print:hidden">{t("coverHint")}</p>
          </div>
        </article>
      );
    case "toc":
      return (
        <article className="menubook-page" data-sheet="toc">
          <header className="menubook-head">
            <BookOpen className="size-5" />
            <h2>{t("contents")}</h2>
          </header>
          <ol className="menubook-toc">
            {page.sections.map((s) => (
              <li key={s.category.id}>
                <span className="min-w-0 truncate">{s.category.name}</span>
                <span className="menuitem-leader" aria-hidden />
                <span>{s.page}</span>
              </li>
            ))}
          </ol>
          {shop.profile?.description && (
            <p className="menubook-about">{shop.profile.description}</p>
          )}
          {folio}
        </article>
      );
    case "category":
      return (
        <article className="menubook-page" data-sheet="category">
          <header className="menubook-head">
            <h2>
              {page.category.name}
              {page.part > 1 && <span className="menubook-cont"> {t("continued")}</span>}
            </h2>
          </header>
          <ul className="menubook-items">
            {page.items.map((item) => (
              <li key={item.id}>
                <MenuItemCard
                  item={item}
                  variant="sheet"
                  href={linkItems ? `/s/${shop.slug}/menu/${item.id}` : undefined}
                />
              </li>
            ))}
          </ul>
          {folio}
        </article>
      );
    case "blank":
      return (
        <article className="menubook-page menubook-blank" data-sheet="blank">
          <ThumbsUp className="size-8 opacity-30" />
          <p>{t("thankYou")}</p>
          {folio}
        </article>
      );
    case "back": {
      const p = shop.profile;
      const rows: { icon: React.ReactNode; label: string; value: string }[] = [];
      if (p?.phone) rows.push({ icon: <Phone className="size-4" />, label: t("phone"), value: p.phone });
      if (p?.openingHours) rows.push({ icon: <Clock className="size-4" />, label: t("openingHours"), value: p.openingHours });
      if (shop.branch?.address) rows.push({ icon: <MapPin className="size-4" />, label: t("address"), value: shop.branch.address });
      if (p?.lineUrl) rows.push({ icon: <MessageCircle className="size-4" />, label: t("line"), value: p.lineUrl });
      if (p?.facebookUrl) rows.push({ icon: <Globe className="size-4" />, label: t("facebook"), value: p.facebookUrl });
      if (p?.websiteUrl) rows.push({ icon: <Globe className="size-4" />, label: t("website"), value: p.websiteUrl });
      return (
        <article className="menubook-page menubook-back" data-sheet="back">
          <div className="menubook-back-inner">
            {shop.logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- internal image route
              <img src={shop.logoSrc} alt="" className="menubook-back-logo" />
            ) : (
              <Store className="size-10" />
            )}
            <h2 className="menubook-cover-title">{shop.name}</h2>
            <p className="menubook-kicker">{t("backCoverTitle")}</p>
            {rows.length > 0 && (
              <dl className="menubook-contact">
                {rows.map((r) => (
                  <div key={r.label}>
                    <dt>{r.icon} {r.label}</dt>
                    <dd>{r.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="menubook-cover-halal">
              <QrCode className="size-4" /> {t("scanToOrder")}
            </p>
          </div>
        </article>
      );
    }
  }
}
