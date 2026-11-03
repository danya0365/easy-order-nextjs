"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";

import { reviewCreditTopupAction } from "@/src/presentation/actions/credit-actions";
import { Button } from "@/src/presentation/components/ui/Button";

export function CreditTopupReview({ topupId }: { topupId: string }) {
  const t = useTranslations("credit");
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ error?: string; success?: string }>({});
  const [pending, start] = useTransition();
  const run = (d: "approve" | "reject") =>
    start(async () => {
      const r = await reviewCreditTopupAction(topupId, d, d === "reject" ? reason : null);
      setMsg(r);
      if (r.success) router.refresh();
    });
  return (
    <div className="flex flex-col gap-3" data-testid="credit-review">
      <Button onClick={() => run("approve")} loading={pending} data-testid="credit-approve">
        <Check className="size-4" /> {t("approve")}
      </Button>
      <div className="flex gap-2">
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("rejectReason")} maxLength={300} className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground" />
        <Button variant="danger" onClick={() => run("reject")} disabled={pending || !reason.trim()}>
          <X className="size-4" /> {t("reject")}
        </Button>
      </div>
      {msg.error && <p className="rounded-lg bg-error-surface px-3 py-2 text-sm text-error">{msg.error}</p>}
      {msg.success && <p className="rounded-lg bg-success-surface px-3 py-2 text-sm text-success">{msg.success}</p>}
    </div>
  );
}
