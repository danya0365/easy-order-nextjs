import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { TopupStatusBadge } from "@/src/presentation/components/credit/CreditBits";
import { CreditTopupReview } from "@/src/presentation/components/credit/CreditTopupReview";
import { satangToBaht } from "@/src/presentation/lib/money";
import { formatDateTime } from "@/src/presentation/lib/format-date";

export const dynamic = "force-dynamic";

export default async function AdminTopupDetailPage({ params }: { params: Promise<{ topupId: string }> }) {
  await requireRole("platform_admin");
  const { topupId } = await params;
  const t = await getTranslations("credit");
  const x = await container.creditRepository.findTopup(topupId);
  if (!x) notFound();
  const [shop, balance, reviewer] = await Promise.all([
    container.shopRepository.findById(x.shopId),
    container.creditRepository.getBalance(x.shopId),
    x.reviewedBy && !x.reviewedBy.startsWith("system:") ? container.userRepository.findById(x.reviewedBy) : Promise.resolve(null),
  ]);
  const slip = `/api/credit-slips/${x.id}`;
  const rows: [string, React.ReactNode][] = [
    [t("shop"), <Link key="s" href={`/admin/credit/shops/${x.shopId}`} className="text-brand-700 underline">{shop?.name ?? x.shopId}</Link>],
    [t("youPay"), `฿${satangToBaht(x.amountSatang)}`],
    [t("bonus"), `฿${satangToBaht(x.bonusSatang)}${x.packageId ? ` (${x.packageId})` : ""}`],
    [t("balance"), `฿${satangToBaht(balance)}`],
    [t("time"), formatDateTime(x.createdAt)],
    [t("note"), x.note ?? "—"],
  ];
  if (x.reviewedAt) rows.push([t("reviewedBy"), `${reviewer?.email ?? x.reviewedBy ?? "—"} · ${formatDateTime(x.reviewedAt)}`]);
  if (x.rejectReason) rows.push([t("rejectReason"), x.rejectReason]);
  if (x.verifyMeta) rows.push([t("autoVerify"), <code key="v" className="text-xs">{JSON.stringify(x.verifyMeta)}</code>]);
  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/credit/topups" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <Card>
        <CardHeader title={t("reviewTitle")} action={<TopupStatusBadge status={x.status} />} />
        <div className="grid gap-4 sm:grid-cols-2">
          <a href={slip} target="_blank" rel="noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slip} alt="slip" className="max-h-96 w-full rounded-xl bg-muted-surface object-contain" data-testid="credit-slip-img" />
            <span className="mt-1 inline-flex items-center gap-1 text-xs text-brand-700"><ExternalLink className="size-3" /> {t("openSlip")}</span>
          </a>
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="min-w-0 break-words text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            {x.status === "pending" && <CreditTopupReview topupId={x.id} />}
          </div>
        </div>
      </Card>
    </div>
  );
}
