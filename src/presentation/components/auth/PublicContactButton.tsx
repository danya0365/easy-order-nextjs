"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Modal } from "@/src/presentation/components/ui/Modal";
import { PublicContactForm } from "./PublicContactForm";

/**
 * Trigger that opens the public contact-admin form in a modal. Renders as a
 * subtle text link by default; pass `className` to restyle.
 */
export function PublicContactButton({
  label,
  className = "text-sm text-brand-700 hover:underline",
}: {
  label?: string;
  className?: string;
}) {
  const t = useTranslations("auth");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label ?? t("contactAdmin")}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("contactAdmin")}>
        <PublicContactForm onCancel={() => setOpen(false)} />
      </Modal>
    </>
  );
}
