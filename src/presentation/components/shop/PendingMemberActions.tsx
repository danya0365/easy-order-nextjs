"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, Ban, PhoneOff, ShieldAlert } from "lucide-react";

import {
  approveOnlineMemberAction,
  rejectOnlineMemberAction,
  blockMemberPhoneAction,
  rejectSuspiciousMembersAction,
} from "@/src/presentation/actions/customer-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { useToast } from "@/src/presentation/components/ui/Toast";
import { useConfirm } from "@/src/presentation/components/ui/ConfirmDialog";

export function PendingMemberActions({ customerId, canBlock = true }: { customerId: string; canBlock?: boolean }) {
  const t = useTranslations("shopPages");
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await approveOnlineMemberAction(customerId);
            if (res.error) toast.error(res.error);
            else toast.success(res.message || t("custApproved"));
          })
        }
      >
        <CheckCircle className="size-4" />
        {t("approveMember")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await rejectOnlineMemberAction(customerId);
            if (res.error) toast.error(res.error);
            else toast.success(res.message || t("custRejected"));
          })
        }
      >
        <Ban className="size-4" />
        {t("rejectMember")}
      </Button>
      {canBlock && (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        title={t("blockPhone")}
        onClick={async () => {
          const ok = await confirm({
            title: t("blockPhone"),
            message: t("blockPhoneConfirm"),
            tone: "danger",
          });
          if (!ok) return;
          start(async () => {
            const res = await blockMemberPhoneAction(customerId);
            if (res.error) toast.error(res.error);
            else toast.success(res.message || t("blockPhone"));
          });
        }}
      >
        <PhoneOff className="size-4" />
        {t("blockPhone")}
      </Button>
      )}
    </div>
  );
}

/** Reject every pending request flagged suspicious. */
export function RejectSuspiciousButton() {
  const t = useTranslations("shopPages");
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="danger"
      disabled={pending}
      onClick={async () => {
        const ok = await confirm({
          title: t("rejectAllSuspicious"),
          message: t("rejectAllSuspiciousConfirm"),
          tone: "danger",
        });
        if (!ok) return;
        start(async () => {
          const res = await rejectSuspiciousMembersAction();
          if (res.error) toast.error(res.error);
          else toast.success(res.message || t("custRejected"));
        });
      }}
    >
      <ShieldAlert className="size-4" />
      {t("rejectAllSuspicious")}
    </Button>
  );
}
