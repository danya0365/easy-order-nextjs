"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  contactAdminPublicAction,
  type ContactFormState,
} from "@/src/presentation/actions/contact-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { Input } from "@/src/presentation/components/ui/Input";
import { Textarea } from "@/src/presentation/components/ui/Textarea";
import { TurnstileWidget } from "./TurnstileWidget";

/**
 * Unauthenticated "contact admin" form on the login page (for users locked out).
 * Server action adds honeypot + CAPTCHA + per-IP rate-limit.
 */
export function PublicContactForm({ onCancel }: { onCancel?: () => void }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState<ContactFormState, FormData>(
    contactAdminPublicAction,
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
            {tc("close")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm text-muted">{t("contactCantLogin")}</p>
      <Input
        name="email"
        type="email"
        placeholder={t("contactEmailPlaceholder")}
        maxLength={200}
        required
      />
      <Input
        name="subject"
        placeholder={t("contactSubjectPlaceholder")}
        maxLength={120}
        required
      />
      <Textarea
        name="message"
        placeholder={t("contactMessagePlaceholder")}
        rows={4}
        maxLength={1000}
        required
      />
      <Input
        name="contactChannel"
        placeholder={t("contactChannelPlaceholder")}
        maxLength={200}
        required
      />
      {/* Honeypot — hidden from humans; bots tend to fill it. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />
      <TurnstileWidget siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? t("contactSending") : t("contactSubmit")}
        </Button>
      </div>
    </form>
  );
}
