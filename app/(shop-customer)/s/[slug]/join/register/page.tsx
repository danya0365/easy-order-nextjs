import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function JoinRegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("shopPages");
  const shop = await container.shopRepository.findBySlug(slug);
  if (!shop) notFound();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-4 p-4">
      <Card>
        <CardHeader
          title={t("joinRegisterTitle")}
          subtitle={t("joinRegisterSubtitle", { shop: shop.name })}
        />
        <RegisterForm
          slug={slug}
          memberOtpEnabled={shop.memberOtpEnabled}
        />
      </Card>
    </div>
  );
}
