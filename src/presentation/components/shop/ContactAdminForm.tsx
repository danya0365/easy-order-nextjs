"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  contactAdminAction,
  type ContactFormState,
} from "@/src/presentation/actions/contact-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { Input } from "@/src/presentation/components/ui/Input";
import { Textarea } from "@/src/presentation/components/ui/Textarea";

/**
 * The contact-admin form itself (fields + submit). Rendered inline on the
 * /shop/contact page and inside a Modal by ContactAdminButton. Pass `onCancel`
 * to show a cancel/close button (modal mode).
 */
export function ContactAdminForm({ onCancel }: { onCancel?: () => void }) {
  const t = useTranslations("shop");
  const [state, action, pending] = useActionState<ContactFormState, FormData>(
    contactAdminAction,
    {},
  );

  if (state.success) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="inline-flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="size-5 shrink-0" />
          {state.success}
        </p>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            {t("contactClose")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <Input name="subject" placeholder={t("contactSubject")} maxLength={120} required />
      <Textarea
        name="message"
        placeholder={t("contactMessage")}
        rows={4}
        maxLength={1000}
        required
      />
      <Input
        name="contactChannel"
        placeholder={t("contactChannel")}
        maxLength={200}
        required
      />
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("contactCancel")}
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? t("contactSending") : t("contactSubmit")}
        </Button>
      </div>
    </form>
  );
}
