"use client";

import { UserX } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { revokeRiderMembershipAction } from "@/src/presentation/actions/rider-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { useToast } from "@/src/presentation/components/ui/Toast";

export function RevokeRiderButton({ riderId }: { riderId: string }) {
  const t = useTranslations("rider");
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  function revoke() {
    if (!confirm(t("revokeConfirm"))) return;
    start(async () => {
      const res = await revokeRiderMembershipAction(riderId);
      if (res.error) toast.error(res.error);
      else {
        toast.success(t("revokeDone"));
        router.refresh();
      }
    });
  }

  return (
    <Button variant="danger" onClick={revoke} disabled={pending} data-testid="rider-revoke">
      <UserX className="size-4" />
      {t("revoke")}
    </Button>
  );
}
