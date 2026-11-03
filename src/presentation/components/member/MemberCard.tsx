import { CalendarDays, Coins, Phone, ReceiptText, UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { MemberCard as MemberCardData } from "@/src/application/use-cases/member/GetMemberCardUseCase";
import { maskPhone } from "@/src/domain/services/customer-crm";
import { formatDate } from "@/src/presentation/lib/format-date";
import { Card } from "@/src/presentation/components/ui/Card";
import { UnlinkMemberButton } from "@/src/presentation/components/member/UnlinkMemberButton";

/** Top-of-history "who am I" card for a device-bound member. */
export async function MemberCard({ slug, card }: { slug: string; card: MemberCardData }) {
  const t = await getTranslations("publicPages");
  const name = card.displayName || t("memberNoName");
  return (
    <div id="member" data-testid="member-card">
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <UserRound className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted">{t("memberCardLabel")}</p>
          <p className="truncate text-base font-bold text-foreground" data-testid="member-name">{name}</p>
          <p className="flex items-center gap-1 text-sm text-muted">
            <Phone className="size-3.5" />
            {maskPhone(card.phone)}
          </p>
        </div>
      </div>
      <dl className={`grid gap-2 text-center ${card.points === null ? "grid-cols-2" : "grid-cols-3"}`}>
        <div className="rounded-xl bg-muted-surface px-2 py-2">
          <dt className="flex items-center justify-center gap-1 text-[11px] text-muted">
            <CalendarDays className="size-3.5" />
            {t("memberSince")}
          </dt>
          <dd className="text-sm font-semibold text-foreground">{formatDate(card.memberSince)}</dd>
        </div>
        <div className="rounded-xl bg-muted-surface px-2 py-2">
          <dt className="flex items-center justify-center gap-1 text-[11px] text-muted">
            <ReceiptText className="size-3.5" />
            {t("memberOrderCount")}
          </dt>
          <dd className="text-sm font-semibold text-foreground" data-testid="member-order-count">{card.orderCount}</dd>
        </div>
        {card.points !== null ? (
          <div className="rounded-xl bg-muted-surface px-2 py-2">
            <dt className="flex items-center justify-center gap-1 text-[11px] text-muted">
              <Coins className="size-3.5" />
              {t("memberPoints")}
            </dt>
            <dd className="text-sm font-semibold text-foreground">{card.points.toLocaleString("th-TH")}</dd>
          </div>
        ) : null}
      </dl>
      <div className="flex justify-end">
        <UnlinkMemberButton slug={slug} label={t("memberUnlink")} confirmText={t("memberUnlinkConfirm")} />
      </div>
    </Card>
    </div>
  );
}
