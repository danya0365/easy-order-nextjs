import Link from "next/link";
import { ArrowLeft, QrCode, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { renderQrDataUrl } from "@/src/infrastructure/services/qr";
import { getBaseUrl } from "@/src/presentation/lib/base-url";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { StaticJoinQrCard } from "@/src/presentation/components/shop/StaticJoinQrCard";
import { StaticJoinControls } from "@/src/presentation/components/shop/StaticJoinControls";
import { MemberSettingsForm } from "@/src/presentation/components/shop/MemberSettingsForm";
import {
  MEMBER_POLICY_BOUNDS,
  MEMBER_POLICY_DEFAULTS,
  effectiveMemberPolicy,
} from "@/src/domain/services/member-policy";

export const dynamic = "force-dynamic";

export default async function ShopMemberSettingsPage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("shopPages");
  const shop = await container.shopRepository.findById(shopId);
  if (!shop) notFound();

  const staticJoin = await (async () => {
    if (!shop.onlineOrderingEnabled) return null;
    const k = await container.shopRepository.getStaticJoinToken(shop.id);
    if (!k) return null;
    const url = `${await getBaseUrl()}/s/${shop.slug}/join?k=${encodeURIComponent(k)}`;
    return { url, qr: await renderQrDataUrl(url) };
  })();

  // Shop logo for the printed QR card (inlined so the print iframe needs no fetch).
  const logoDataUrl = await (async () => {
    if (!staticJoin) return null;
    const profile = await container.shopImageRepository.findProfile(shop.id);
    if (!profile) return null;
    const file = await container.slipStorage.read(profile.storageKey);
    if (!file) return null;
    return `data:${file.contentType};base64,${Buffer.from(file.bytes).toString("base64")}`;
  })();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/shop/settings"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("memberSettingsBack")}
      </Link>

      <Card>
        <CardHeader
          title={t("staticJoinQrTitle")}
          subtitle={t("staticJoinQrSubtitle")}
        />
        {staticJoin ? (
          <>
            <StaticJoinQrCard
              qrDataUrl={staticJoin.qr}
              joinUrl={staticJoin.url}
              shopName={shop.name}
              logoDataUrl={logoDataUrl}
            />
            <div className="mt-4">
              <StaticJoinControls
                paused={shop.memberSignupPaused}
                showPause={false}
              />
            </div>
          </>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted">
            <QrCode className="size-4" />
            {t("memberSettingsQrOff")}
          </p>
        )}
      </Card>

      <Card>
        <CardHeader
          title={t("memberSettingsTitle")}
          subtitle={t("memberSettingsSubtitle")}
        />
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-muted-surface px-3 py-2 text-sm text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-500" />
          {t("memberSettingsApprovalLocked")}
        </p>
        <MemberSettingsForm
          policy={effectiveMemberPolicy(shop.memberPolicyOverrides)}
          defaults={MEMBER_POLICY_DEFAULTS}
          bounds={MEMBER_POLICY_BOUNDS}
          memberOtpEnabled={shop.memberOtpEnabled}
          memberSignupPaused={shop.memberSignupPaused}
        />
      </Card>
    </div>
  );
}
