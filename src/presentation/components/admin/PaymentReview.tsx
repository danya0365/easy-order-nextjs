"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { verifyPaymentAction } from "@/src/presentation/actions/admin-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { Input } from "@/src/presentation/components/ui/Input";

export function PaymentReview({ paymentId }: { paymentId: string }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  function approve() {
    start(async () => {
      await verifyPaymentAction(paymentId, "approve");
    });
  }

  function reject() {
    start(async () => {
      await verifyPaymentAction(paymentId, "reject", reason || t("prRejectDefault"));
      setRejecting(false);
      setReason("");
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button size="sm" onClick={approve} disabled={pending}>
          {t("prApprove")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRejecting((v) => !v)}
          disabled={pending}
        >
          {t("prReject")}
        </Button>
      </div>
      {rejecting && (
        <div className="flex gap-2">
          <Input
            placeholder={t("prReasonPlaceholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button size="sm" variant="danger" onClick={reject} disabled={pending}>
            {t("prConfirmReject")}
          </Button>
        </div>
      )}
    </div>
  );
}
