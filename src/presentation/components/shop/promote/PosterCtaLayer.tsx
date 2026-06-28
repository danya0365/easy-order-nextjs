"use client";

/* eslint-disable @next/next/no-img-element */
import { ScanLine, Stamp } from "lucide-react";
import { useTranslations } from "next-intl";

import type { TemplateCopy } from "@/src/domain/services/promo-poster";
import type { PromoSeedData } from "./types";

/**
 * The loyalty call-to-action panel that sits on EVERY exported poster (template
 * path A and upload path B alike): shop name, promo copy, the scan-to-join QR,
 * and the public URL. This is what turns a pretty image into customers in the
 * stamp loop. Sized in px scaled from a 1080-wide design so it stays crisp at
 * any poster size.
 */
export function PosterCtaLayer({
  copy,
  seed,
  scale,
}: {
  copy: TemplateCopy;
  seed: PromoSeedData;
  scale: number;
}) {
  const t = useTranslations("promote");
  const px = (n: number) => `${Math.round(n * scale)}px`;

  return (
    <div
      className="bg-card text-foreground"
      style={{
        borderRadius: px(40),
        padding: px(48),
        boxShadow: `0 ${px(12)} ${px(48)} rgba(0,0,0,0.25)`,
        display: "flex",
        flexDirection: "column",
        gap: px(20),
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <p
        className="font-semibold text-brand-600"
        style={{ fontSize: px(30), lineHeight: 1.2 }}
      >
        {t("ctaShopLine", { shopName: seed.shopName })}
      </p>
      <h2
        className="font-bold text-foreground"
        style={{ fontSize: px(48), lineHeight: 1.15 }}
      >
        {copy.headline}
      </h2>
      <p className="text-muted" style={{ fontSize: px(30), lineHeight: 1.3 }}>
        {copy.subcopy}
      </p>
      {/* Reassurance: stamps are earned at the shop, no signup/scan needed. */}
      <p
        className="inline-flex items-center font-semibold text-brand-700"
        style={{ fontSize: px(28), gap: px(8), lineHeight: 1.25 }}
      >
        <Stamp style={{ width: px(30), height: px(30) }} />
        {copy.valueLine}
      </p>
      <img
        src={seed.qrDataUrl}
        alt={t("ctaQrAlt", { shopName: seed.shopName })}
        style={{
          width: px(260),
          height: px(260),
          objectFit: "contain",
          borderRadius: px(16),
        }}
      />
      {/* QR is optional/info only — see the shop, rewards, or your balance. */}
      <p
        className="inline-flex items-center text-muted"
        style={{ fontSize: px(24), gap: px(8), lineHeight: 1.2 }}
      >
        <ScanLine style={{ width: px(26), height: px(26) }} />
        {t("ctaScanLine")}
      </p>
      <p
        className="break-all text-muted"
        style={{ fontSize: px(20), lineHeight: 1.2 }}
      >
        {seed.publicUrl}
      </p>
    </div>
  );
}
