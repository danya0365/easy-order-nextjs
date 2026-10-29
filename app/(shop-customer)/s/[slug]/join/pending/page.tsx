import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Clock } from "lucide-react";

import { Card, CardHeader } from "@/src/presentation/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function JoinPendingPage({
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
          title={t("joinPendingTitle")}
          subtitle={t("joinPendingSubtitle")}
        />
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Clock className="size-10 text-brand-500" />
          <p className="text-sm text-muted">{t("joinPendingMessage")}</p>
          <Link
            href={`/s/${slug}`}
            className="mt-2 text-sm font-medium text-brand-700 hover:underline"
          >
            {t("backToShop")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
