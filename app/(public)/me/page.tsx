import Link from "next/link";
import { History, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { getAllMemberTokens } from "@/src/infrastructure/auth/member";
import { GetBoundShopsUseCase } from "@/src/application/use-cases/member/GetBoundShopsUseCase";
import { Card } from "@/src/presentation/components/ui/Card";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function MyShopsPage() {
  const t = await getTranslations("publicPages");
  const tokens = (await getAllMemberTokens()).map((b) => b.token);
  const shops = await new GetBoundShopsUseCase(
    container.shopRepository,
    container.customerDeviceRepository,
  ).execute(tokens);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          {t("myShopsTitle")}
        </h1>
        <p className="text-sm text-muted">{t("myShopsSubtitle")}</p>
      </div>

      {shops.length === 0 ? (
        <EmptyState icon={<History />} title={t("noBoundShops")} />
      ) : (
        <Card>
          <ul className="flex flex-col divide-y divide-border">
            {shops.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/s/${s.slug}`}
                  className="flex items-center justify-between gap-3 py-3 text-foreground transition hover:text-brand-700"
                >
                  <span className="font-medium">{s.shopName}</span>
                  <span className="flex items-center gap-1 text-sm text-muted">
                    {t("viewOrders")}
                    <ChevronRight className="size-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}
