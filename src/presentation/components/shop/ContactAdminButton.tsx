"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/src/presentation/components/ui/Button";
import { Modal } from "@/src/presentation/components/ui/Modal";
import { ContactAdminForm } from "./ContactAdminForm";

/** Quick "contact admin" trigger — opens the shared form in a modal. */
export function ContactAdminButton() {
  const t = useTranslations("shop");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <MessageSquare size={16} />
        {t("contactAdmin")}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={t("contactAdmin")}>
        <ContactAdminForm onCancel={() => setOpen(false)} />
      </Modal>
    </>
  );
}
