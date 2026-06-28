"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download, ShieldOff } from "lucide-react";

import { anonymizeCustomerAction } from "@/src/presentation/actions/customer-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { Modal } from "@/src/presentation/components/ui/Modal";
import { useToast } from "@/src/presentation/components/ui/Toast";

export function CustomerRowActions({ customerId }: { customerId: string }) {
  const t = useTranslations("shop");
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function confirmAnonymize() {
    start(async () => {
      const res = await anonymizeCustomerAction(customerId);
      if (res.error) toast.error(res.error);
      else {
        toast.success(t("custAnonymized"));
        setOpen(false);
      }
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <a
        href={`/api/shop/customers/${customerId}/data-export`}
        className="inline-flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-muted-surface hover:text-foreground"
        aria-label={t("custExport")}
        title={t("custExport")}
      >
        <Download className="size-4" />
      </a>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-9 items-center justify-center rounded-full text-error transition hover:bg-muted-surface"
        aria-label={t("custAnonymize")}
        title={t("custAnonymize")}
      >
        <ShieldOff className="size-4" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("custAnonymizeTitle")}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              {t("custCancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={pending}
              onClick={confirmAnonymize}
            >
              {pending ? t("custAnonymizing") : t("custAnonymizeConfirm")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t("custAnonymizeMessage")}</p>
      </Modal>
    </div>
  );
}
