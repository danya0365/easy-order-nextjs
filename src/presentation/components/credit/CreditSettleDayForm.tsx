"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarClock } from "lucide-react";

import { settleCreditDayAction } from "@/src/presentation/actions/credit-actions";
import { Button } from "@/src/presentation/components/ui/Button";

/** Admin: settle one closed business day now (test / backfill). Idempotent. */
export function CreditSettleDayForm({ shopId, defaultDate }: { shopId: string; defaultDate: string }) {
  const t = useTranslations("credit");
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);
  const [msg, setMsg] = useState<{ error?: string; success?: string }>({});
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      data-testid="settle-day-form"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await settleCreditDayAction(shopId, date);
          setMsg(r);
          if (r.success) router.refresh();
        });
      }}
    >
      <p className="text-xs text-muted">{t("settleDesc")}</p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-foreground">{t("settleDate")}</span>
        <input type="date" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground" value={date} onChange={(e) => setDate(e.target.value)} data-testid="settle-date" required />
      </label>
      {msg.error && <p className="rounded-lg bg-error-surface px-3 py-2 text-sm text-error">{msg.error}</p>}
      {msg.success && <p className="rounded-lg bg-success-surface px-3 py-2 text-sm text-success" data-testid="settle-result">{msg.success}</p>}
      <Button type="submit" loading={pending} data-testid="settle-submit">
        <CalendarClock className="size-4" /> {t("settleBtn")}
      </Button>
    </form>
  );
}
