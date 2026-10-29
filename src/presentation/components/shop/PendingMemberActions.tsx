"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, Ban } from "lucide-react";

import {
  approveOnlineMemberAction,
  rejectOnlineMemberAction,
} from "@/src/presentation/actions/customer-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { useToast } from "@/src/presentation/components/ui/Toast";

export function PendingMemberActions({ customerId }: { customerId: string }) {
  const t = useTranslations("shopPages");
  const toast = useToast();
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
    </div>
  );
}
