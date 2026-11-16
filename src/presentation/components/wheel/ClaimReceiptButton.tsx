"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, FerrisWheel, Ticket } from "lucide-react";

import { claimWheelReceiptAction } from "@/src/presentation/actions/wheel-actions";
import { Button } from "@/src/presentation/components/ui/Button";

export function ClaimReceiptButton({ slug, orderId, token }: { slug: string; orderId: string; token: string }) {
  const t = useTranslations("wheel");
  const [pending, start] = useTransition();
  const [granted, setGranted] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (granted !== null) {
    return (
      <div className="flex flex-col items-center gap-3 text-center" data-testid="wheel-claim-done">
        <CheckCircle2 className="size-10 text-green-600" />
        <p className="font-semibold text-foreground">{t("claimDone", { count: granted })}</p>
        <Link
          href={`/s/${slug}/wheel`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-on-brand"
        >
          <FerrisWheel className="size-4" />
          {t("goSpin")}
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Button
        fullWidth
        loading={pending}
        data-testid="wheel-claim"
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await claimWheelReceiptAction(slug, orderId, token);
            if (r.error) setError(r.error);
            else setGranted(r.granted ?? 0);
          })
        }
      >
        <Ticket className="size-4" />
        {t("claimButton")}
      </Button>
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}
