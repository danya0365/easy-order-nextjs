import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { CreditLedgerEntry } from "@/src/application/repositories/ICreditRepository";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { satangToBaht } from "@/src/presentation/lib/money";
import { formatDateTime } from "@/src/presentation/lib/format-date";
import { CreditAmount } from "./CreditBits";

export async function CreditEntryDetail({
  entry,
  backHref,
  orderHref,
  topupHref,
  actorLabel,
  showActor = true,
}: {
  entry: CreditLedgerEntry;
  backHref: string;
  orderHref?: string | null;
  topupHref?: string | null;
  actorLabel?: string | null;
  showActor?: boolean;
}) {
  const t = await getTranslations("credit");
  const rows: [string, React.ReactNode][] = [
    [t("amount"), <CreditAmount key="a" satang={entry.amountSatang} />],
    [t("balanceAfter", { amount: "" }).trim(), <span key="b" className="tabular-nums">฿{satangToBaht(entry.balanceAfterSatang)}</span>],
    [t("reason"), entry.reason ?? "—"],
    [t("time"), formatDateTime(entry.createdAt)],
  ];
  if (showActor) rows.push([t("actor"), actorLabel ?? (entry.actorUserId ? entry.actorUserId : t("system"))]);
  else rows.push([t("actor"), entry.actorUserId ? "admin" : t("system")]);
  if (entry.orderId) rows.push([t("order"), orderHref ? <Link key="o" href={orderHref} className="text-brand-700 underline">{entry.orderId}</Link> : entry.orderId]);
  if (entry.topupId) rows.push([t("topupRef"), topupHref ? <Link key="tp" href={topupHref} className="text-brand-700 underline">{entry.topupId}</Link> : entry.topupId]);
  rows.push([t("entryId"), <code key="id" className="text-xs">{entry.id}</code>]);
  return (
    <div className="flex flex-col gap-4" data-testid="credit-entry-detail">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <Card>
        <CardHeader title={`${t("entryTitle")} · ${t(`type_${entry.type}`)}`} />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="min-w-0 break-words text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        {entry.meta && (
          <details className="mt-4 text-xs text-muted">
            <summary className="cursor-pointer">{t("meta")}</summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-muted-surface p-3">{JSON.stringify(entry.meta, null, 2)}</pre>
          </details>
        )}
      </Card>
    </div>
  );
}
