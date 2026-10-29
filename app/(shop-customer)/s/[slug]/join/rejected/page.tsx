import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Ban } from "lucide-react";

import { Card, CardHeader } from "@/src/presentation/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function JoinRejectedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("shopPages");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-4 p-4">
      <Card>
        <CardHeader
          title={t("joinRejectedTitle")}
          subtitle={t("joinRejectedSubtitle")}
        />
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Ban className="size-10 text-error" />
          <p className="text-sm text-muted">{t("joinRejectedMessage")}</p>
          <Link
            href={`/s/${slug}/join/register`}
            className="mt-2 text-sm font-medium text-brand-700 hover:underline"
          >
            {t("joinRegisterTitle")}
          </Link>
          <Link
            href={`/s/${slug}`}
            className="text-sm text-muted hover:underline"
          >
            {t("backToShop")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
