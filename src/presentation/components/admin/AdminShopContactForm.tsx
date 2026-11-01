"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link2, MessageCircle, Phone, QrCode } from "lucide-react";

import {
  adminUpdateShopContactAction,
  type AdminConfigState,
} from "@/src/presentation/actions/admin-shop-config-actions";
import { Input } from "@/src/presentation/components/ui/Input";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";

export function AdminShopContactForm({
  shopId,
  phone,
  promptpayTarget,
  lineUrl,
  facebookUrl,
}: {
  shopId: string;
  phone: string | null;
  promptpayTarget: string | null;
  lineUrl: string | null;
  facebookUrl: string | null;
}) {
  const t = useTranslations("adminConfig");
  const [state, action, pending] = useActionState<AdminConfigState, FormData>(
    adminUpdateShopContactAction,
    {},
  );
  return (
    <form action={action} className="flex flex-col gap-3" data-testid="admin-shop-contact-form">
      <input type="hidden" name="shopId" value={shopId} />
      <FormField label={t("contactPhone")} htmlFor="phone" hint={t("contactPhoneHint")}>
        <div className="flex items-center gap-2">
          <Phone className="size-4 shrink-0 text-muted" />
          <Input id="phone" name="phone" type="tel" inputMode="numeric" maxLength={20} defaultValue={phone ?? ""} />
        </div>
      </FormField>
      <FormField label={t("contactPromptpay")} htmlFor="promptpayTarget" hint={t("contactPromptpayHint")}>
        <div className="flex items-center gap-2">
          <QrCode className="size-4 shrink-0 text-muted" />
          <Input id="promptpayTarget" name="promptpayTarget" inputMode="numeric" maxLength={25} defaultValue={promptpayTarget ?? ""} />
        </div>
      </FormField>
      <FormField label={t("contactLine")} htmlFor="line" hint={t("contactLineHint")}>
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 shrink-0 text-muted" />
          <Input id="line" name="line" maxLength={300} defaultValue={lineUrl ?? ""} />
        </div>
      </FormField>
      <FormField label={t("contactFacebook")} htmlFor="facebookUrl" hint={t("contactFacebookHint")}>
        <div className="flex items-center gap-2">
          <Link2 className="size-4 shrink-0 text-muted" />
          <Input id="facebookUrl" name="facebookUrl" maxLength={300} defaultValue={facebookUrl ?? ""} />
        </div>
      </FormField>
      <p className="text-xs text-muted">{t("contactEmptyHidden")}</p>
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{t("saved")}</p>}
      <Button type="submit" disabled={pending} loading={pending}>{t("save")}</Button>
    </form>
  );
}
