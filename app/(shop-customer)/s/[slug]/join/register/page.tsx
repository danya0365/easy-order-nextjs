import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { QrCode, PauseCircle } from "lucide-react";

import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { staticJoinTokenMatches } from "@/src/domain/services/static-join-guard";
import { staticJoinTurnstileSiteKey } from "@/src/infrastructure/services/turnstile";
import { RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function JoinRegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { slug } = await params;
  const { k } = await searchParams;
  const t = await getTranslations("shopPages");
  const shop = await container.shopRepository.findBySlug(slug);
  if (!shop) notFound();

  const expected = await container.shopRepository.getStaticJoinToken(shop.id);
  const keyOk = staticJoinTokenMatches(expected, k ?? null);

  if (!keyOk || shop.memberSignupPaused) {
    const Icon = keyOk ? PauseCircle : QrCode;
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-4 p-4">
        <Card>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Icon className="size-10 text-muted" />
            <h2 className="text-lg font-semibold text-foreground">
              {keyOk ? t("staticJoinPausedTitle") : t("staticJoinInvalidTitle")}
            </h2>
            <p className="text-sm text-muted">
              {keyOk ? t("staticJoinPausedDesc") : t("staticJoinInvalidDesc")}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-4 p-4">
      <Card>
        <CardHeader
          title={t("joinRegisterTitle")}
          subtitle={t("joinRegisterSubtitle", { shop: shop.name })}
        />
        <RegisterForm
          slug={slug}
          joinKey={k ?? ""}
          memberOtpEnabled={shop.memberOtpEnabled}
          turnstileSiteKey={staticJoinTurnstileSiteKey() ?? undefined}
        />
      </Card>
    </div>
  );
}
