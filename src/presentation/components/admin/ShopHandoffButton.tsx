"use client";

import { useState, useTransition } from "react";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";

import { getShopHandoffAction } from "@/src/presentation/actions/admin-actions";
import { Modal } from "@/src/presentation/components/ui/Modal";
import { ShopCredentialsHandoff } from "@/src/presentation/components/admin/ShopCredentialsHandoff";
import type { ShopHandoff } from "@/src/presentation/lib/shop-handoff";

/**
 * Admin row action: open a printable "handoff sheet" for an existing shop —
 * email + login QR + a blank password line (the real password isn't stored).
 * Loads the handoff lazily so the list page doesn't render N QR codes upfront.
 */
export function ShopHandoffButton({ shopId }: { shopId: string }) {
  const t = useTranslations("admin");
  const [handoff, setHandoff] = useState<ShopHandoff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function open() {
    setError(null);
    start(async () => {
      const res = await getShopHandoffAction(shopId);
      if (res.error || !res.handoff) {
        setError(res.error ?? t("handoffOpenFailed"));
      } else {
        setHandoff(res.handoff);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={pending}
        title={t("handoffButtonTitle")}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-foreground disabled:opacity-60"
      >
        <FileText className="size-3.5" />
        {pending ? t("handoffOpening") : t("handoff")}
      </button>
      {error && <p className="text-xs text-error">{error}</p>}

      <Modal
        open={handoff !== null}
        onClose={() => setHandoff(null)}
        title={t("handoffModalTitle")}
      >
        {handoff && (
          <ShopCredentialsHandoff handoff={handoff} passwordPlaceholder />
        )}
      </Modal>
    </>
  );
}
